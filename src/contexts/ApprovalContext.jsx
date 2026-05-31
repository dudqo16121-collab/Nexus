// contexts/ApprovalContext.jsx
// 결재 관리 — 성능 최적화 버전.
// 변경점:
//  - mountedRef + safeSet 으로 unmount 후 setState 방지
//  - Provider value useMemo 로 안정화
//  - 함수형 setState 사용

import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { genDocNumber } from '../config/approvalForms';
import { useNotification } from './NotificationContext';
import { runApprovalLinkage, cleanupLinkedData } from '../utils/approvalLinkage';

const ApprovalContext = createContext(null);

// 양식 종류
export const FORM_TYPES = [
  '업무기안서', '지출결의서', '연차신청서',
  '출장신청서', '구매요청서', '품의서',
];

// 긴급도
export const URGENCY_LEVELS = ['일반', '보통', '긴급'];

// 상태 → 라벨/클래스 매핑
export function getStatusInfo(status, step = 0, total = 0) {
  const map = {
    draft: { label: '임시저장', cls: 'status-draft' },
    pending: { label: '결재 대기', cls: 'status-pending' },
    in_progress: { label: `결재 중 (${step}/${total})`, cls: 'status-in_prog' },
    approved: { label: '결재 완료', cls: 'status-approved' },
    rejected: { label: '반려', cls: 'status-rejected' },
    canceled: { label: '취소됨', cls: 'status-canceled' },
  };
  return map[status] || { label: '알 수 없음', cls: 'status-draft' };
}

export function ApprovalProvider({ children }) {
  const { user, profile } = useAuth();
  const { createNotification } = useNotification();

  /* unmount 가드 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const safeSet = useCallback((setter, data) => {
    if (mountedRef.current) {
      if (typeof data === 'function') {
        setter(data);
      } else {
        setter(data);
      }
    }
  }, []);

  /* ─── state ─── */
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approverOptions, setApproverOptions] = useState([]);

  // 필터 상태
  const [tab, setTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [search, setSearch] = useState('');

  // 빠른 모드
  const [powerModeActive, setPowerModeActive] = useState(false);
  const [powerModeProcessed, setPowerModeProcessed] = useState(0);

  /* ─── 결재자 옵션 로드 ─── */
  const fetchApproverOptions = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, department, rank, is_admin')
      .eq('is_admin', true)
      .order('full_name');

    if (error) {
      console.error('[Approval] fetchApproverOptions error:', error);
      if (mountedRef.current) setApproverOptions([]);
      return;
    }

    if (mountedRef.current) {
      setApproverOptions((data || []).filter((p) => p.id !== user?.id));
    }
  }, [user]);

  /* ─── 목록 로드 ─── */
  const fetchApprovals = useCallback(async () => {
    if (mountedRef.current) setLoading(true);

    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!mountedRef.current) return;

    if (error) {
      console.error('[Approval] fetchApprovals error:', error);
      setApprovals([]);
    } else {
      setApprovals(
        (data || []).map((d) => ({
          ...d,
          approvers: d.approvers || [],
          fields: d.fields || {},
          current_step: d.current_step || 0,
        }))
      );
    }
    setLoading(false);
  }, []);

  /* ─── 단일 문서 조회 ─── */
  const fetchApproval = useCallback(async (docId) => {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', docId)
      .single();

    if (error) {
      console.error('[Approval] fetchApproval error:', error);
      return null;
    }
    return {
      ...data,
      approvers: data.approvers || [],
      fields: data.fields || {},
      current_step: data.current_step || 0,
    };
  }, []);

  /* ─── 내가 현재 결재 차례인지 ─── */
  const isMyTurn = useCallback(
    (doc) => {
      if (!user) return false;
      if (doc.status !== 'pending' && doc.status !== 'in_progress') return false;
      const step = doc.current_step || 0;
      return doc.approvers?.[step]?.id === user.id;
    },
    [user]
  );

  /* ─── 기안 생성 ─── */
  const createApproval = useCallback(
    async ({ type, title, body, note, urgency, fields, approvers, status }) => {
      if (!user) return null;

      const payload = {
        doc_number: genDocNumber(),
        type,
        title: title.trim(),
        body: body.trim(),
        note: (note || '').trim(),
        urgency: urgency || '일반',
        status,
        drafter_id: user.id,
        drafter_name: profile?.full_name || '알 수 없음',
        drafter_dept: profile?.department || '-',
        fields: fields || {},
        approvers: approvers || [],
        current_step: 0,
      };

      const { data, error } = await supabase
        .from('approvals')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Approval] createApproval error:', error);
        return null;
      }

      if (status === 'pending' && data.approvers?.[0]?.id) {
        createNotification({
          toUserId: data.approvers[0].id,
          type: 'approval',
          title: '결재 서류가 상신되었습니다 📄',
          body: `[${type}] ${title.trim()}`,
          link: '/approval',
          refId: data.id,
        });
      }

      if (mountedRef.current) {
        setApprovals((prev) => [
          { ...data, approvers: data.approvers || [], fields: data.fields || {} },
          ...prev,
        ]);
      }
      return data;
    },
    [user, profile, createNotification]
  );

  /* ─── 결재 처리 (승인/반려) ─── */
  const processApproval = useCallback(
    async (docId, action, comment = '') => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };

      const { data: doc, error } = await supabase
        .from('approvals')
        .select('*')
        .eq('id', docId)
        .single();

      if (error || !doc) {
        console.error('[Approval] processApproval fetch error:', error);
        return { ok: false, error: '문서를 불러올 수 없습니다.' };
      }

      const apvs = [...(doc.approvers || [])];
      const step = doc.current_step || 0;

      if (apvs[step]?.id !== user.id) {
        return { ok: false, error: '현재 결재 권한이 없습니다.' };
      }

      apvs[step] = {
        ...apvs[step],
        status: action,
        comment: comment.trim(),
        acted_at: new Date().toISOString(),
      };

      let newStatus = doc.status;
      let newStep = step;

      if (action === 'rejected') {
        newStatus = 'rejected';
      } else if (action === 'approved') {
        if (step + 1 >= apvs.length) {
          newStatus = 'approved';
        } else {
          newStatus = 'in_progress';
          newStep = step + 1;
        }
      }

      const { error: updErr } = await supabase
        .from('approvals')
        .update({
          approvers: apvs,
          status: newStatus,
          current_step: newStep,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);

      if (updErr) {
        console.error('[Approval] processApproval update error:', updErr);
        return { ok: false, error: updErr.message };
      }

      /* 로컬 동기화 */
      if (mountedRef.current) {
        setApprovals((prev) =>
          prev.map((d) =>
            d.id === docId
              ? { ...d, approvers: apvs, status: newStatus, current_step: newStep, updated_at: new Date().toISOString() }
              : d
          )
        );
      }

      /* 다음 결재자 알림 */
      if (action === 'approved' && newStatus === 'in_progress' && apvs[newStep]?.id) {
        createNotification({
          toUserId: apvs[newStep].id,
          type: 'approval',
          title: '결재할 문서가 있어요 📄',
          body: `[${doc.type}] ${doc.title}`,
          link: '/approval',
          refId: docId,
        });
      }

      /* 기안자 알림 */
      if ((newStatus === 'approved' || newStatus === 'rejected') && doc.drafter_id) {
        createNotification({
          toUserId: doc.drafter_id,
          type: 'approval',
          title: newStatus === 'approved' ? '결재가 완료됐어요 ✅' : '결재가 반려됐어요 ❌',
          body: `[${doc.type}] ${doc.title}`,
          link: '/approval',
          refId: docId,
        });
      }

      /* 최종 승인 시 연계 처리 */
      let linkageResult = null;
      if (newStatus === 'approved') {
        try {
          linkageResult = await runApprovalLinkage(doc, user);
        } catch (e) {
          console.warn('[Approval] linkage failed:', e);
        }
      }

      /* 결과 메시지 */
      const result = { ok: true, newStatus, newStep };
      if (newStatus === 'approved') {
        result.message = {
          icon: '🎉',
          title: '최종 승인 완료',
          desc: linkageResult?.message
            ? `모든 결재선을 통과하여 승인이 완료되었습니다.\n${linkageResult.message}`
            : '모든 결재선을 통과하여 승인이 완료되었습니다.',
        };
      } else if (action === 'approved') {
        result.message = {
          icon: '✅',
          title: '승인 완료',
          desc: `다음 결재자 "${apvs[newStep]?.name}"님께 결재 요청이 이동되었습니다.`,
        };
      } else {
        result.message = {
          icon: '❌',
          title: '반려 처리',
          desc: '문서가 기안자에게 반려되었습니다.',
        };
      }
      return result;
    },
    [user, createNotification]
  );

  /* ─── 일괄 처리 ─── */
  const processBulk = useCallback(async (docIds, action, comment = '') => {
    if (!docIds?.length) return { ok: false, error: '선택된 문서가 없습니다' };

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const docId of docIds) {
      try {
        const res = await processApproval(docId, action, comment);
        if (res.ok) successCount++;
        else failCount++;
        results.push({ docId, ...res });
      } catch (e) {
        failCount++;
        results.push({ docId, ok: false, error: e.message });
      }
    }

    await fetchApprovals();

    return {
      ok: successCount > 0,
      successCount,
      failCount,
      results,
    };
  }, [processApproval, fetchApprovals]);

  /* ─── 기안 취소 ─── */
  const cancelApproval = useCallback(async (docId) => {
    const { error } = await supabase
      .from('approvals')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', docId);

    if (error) {
      console.error('[Approval] cancelApproval error:', error);
      return false;
    }

    await cleanupLinkedData(docId);

    if (mountedRef.current) {
      setApprovals((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: 'canceled' } : d))
      );
    }
    return true;
  }, []);

  /* ─── 관리자 영구 삭제 ─── */
  const adminDeleteApproval = useCallback(
    async (docId) => {
      if (profile?.is_admin !== true) {
        return { ok: false, error: '관리자만 삭제할 수 있습니다.' };
      }

      await cleanupLinkedData(docId);

      const { error } = await supabase.from('approvals').delete().eq('id', docId);
      if (error) {
        console.error('[Approval] adminDeleteApproval error:', error);
        return { ok: false, error: error.message };
      }

      if (mountedRef.current) {
        setApprovals((prev) => prev.filter((d) => d.id !== docId));
      }
      return { ok: true };
    },
    [profile]
  );

  /* ─── 필터링된 목록 ─── */
  const filteredApprovals = useMemo(() => {
    let rows = approvals;

    // 탭 필터
    if (tab === 'pending_me') {
      rows = rows.filter((doc) => isMyTurn(doc));
    } else if (tab === 'my_draft') {
      rows = rows.filter((doc) => user && doc.drafter_id === user.id);
    } else if (tab === 'approved') {
      rows = rows.filter((doc) => doc.status === 'approved');
    } else if (tab === 'rejected') {
      rows = rows.filter((doc) => doc.status === 'rejected');
    }

    if (typeFilter) {
      rows = rows.filter((doc) => doc.type === typeFilter);
    }

    if (urgencyFilter) {
      rows = rows.filter((doc) => doc.urgency === urgencyFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (doc) =>
          (doc.title || '').toLowerCase().includes(q) ||
          (doc.doc_number || '').toLowerCase().includes(q)
      );
    }

    return rows;
  }, [approvals, tab, typeFilter, urgencyFilter, search, isMyTurn, user]);

  /* ─── 인접 문서 ID ─── */
  const getAdjacentDocId = useCallback((currentDocId, direction = 'next') => {
    const list = filteredApprovals;
    const idx = list.findIndex((d) => d.id === currentDocId);
    if (idx < 0) return null;
    const targetIdx = direction === 'next' ? idx + 1 : idx - 1;
    return list[targetIdx]?.id || null;
  }, [filteredApprovals]);

  /* ─── 빠른 모드 ─── */
  const myPendingDocIds = useMemo(() => {
    return approvals.filter((doc) => isMyTurn(doc)).map((doc) => doc.id);
  }, [approvals, isMyTurn]);

  const startPowerMode = useCallback(() => {
    setPowerModeActive(true);
    setPowerModeProcessed(0);
  }, []);

  const exitPowerMode = useCallback(() => {
    setPowerModeActive(false);
    setPowerModeProcessed(0);
  }, []);

  const incrementPowerModeProcessed = useCallback(() => {
    setPowerModeProcessed((n) => n + 1);
  }, []);

  /* ─── KPI 계산 ─── */
  const kpi = useMemo(() => {
    const now = new Date();
    const thisMonth = (iso) => {
      const d = new Date(iso);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    };

    /* 평균 처리 시간 */
    const myCompletedThisMonth = approvals.filter(
      (doc) =>
        user &&
        doc.drafter_id === user.id &&
        ['approved', 'rejected'].includes(doc.status) &&
        thisMonth(doc.updated_at)
    );
    let avgHours = 0;
    if (myCompletedThisMonth.length > 0) {
      const totalMs = myCompletedThisMonth.reduce((acc, doc) => {
        const start = new Date(doc.created_at).getTime();
        const end = new Date(doc.updated_at).getTime();
        return acc + (end - start);
      }, 0);
      avgHours = totalMs / myCompletedThisMonth.length / (1000 * 60 * 60);
    }

    /* 양식별 카운트 */
    const byType = {};
    for (const doc of approvals) {
      if (['draft', 'pending', 'in_progress'].includes(doc.status)) {
        const t = doc.type || '기타';
        byType[t] = (byType[t] || 0) + 1;
      }
    }

    /* 이번 주 처리 건수 */
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay() || 7;
    weekStart.setDate(weekStart.getDate() - (day - 1));

    const weekProcessed = approvals.filter((doc) => {
      if (!user) return false;
      const myAction = (doc.approvers || []).find(
        (a) => a.id === user.id && a.acted_at && new Date(a.acted_at) >= weekStart
      );
      return !!myAction;
    }).length;

    return {
      pendingMe: approvals.filter((doc) => isMyTurn(doc)).length,
      myDraft: approvals.filter(
        (doc) =>
          user &&
          doc.drafter_id === user.id &&
          ['pending', 'in_progress'].includes(doc.status)
      ).length,
      drafts: approvals.filter(
        (doc) => user && doc.drafter_id === user.id && doc.status === 'draft'
      ).length,
      approved: approvals.filter(
        (doc) => doc.status === 'approved' && thisMonth(doc.updated_at)
      ).length,
      rejected: approvals.filter(
        (doc) => doc.status === 'rejected' && thisMonth(doc.updated_at)
      ).length,
      avgHours: Math.round(avgHours * 10) / 10,
      weekProcessed,
      byType,
    };
  }, [approvals, isMyTurn, user]);

  /* ─── Provider value 메모이즈 ─── */
  const value = useMemo(() => ({
    // 데이터
    approvals,
    filteredApprovals,
    loading,
    kpi,
    approverOptions,
    // 액션
    fetchApprovals,
    fetchApproval,
    fetchApproverOptions,
    createApproval,
    processApproval,
    processBulk,
    cancelApproval,
    adminDeleteApproval,
    getAdjacentDocId,
    // 빠른 모드
    powerModeActive,
    powerModeProcessed,
    myPendingDocIds,
    startPowerMode,
    exitPowerMode,
    incrementPowerModeProcessed,
    // 필터 상태
    tab,
    typeFilter,
    urgencyFilter,
    search,
    setTab,
    setTypeFilter,
    setUrgencyFilter,
    setSearch,
    // 유틸
    isMyTurn,
  }), [
    approvals, filteredApprovals, loading, kpi, approverOptions,
    fetchApprovals, fetchApproval, fetchApproverOptions,
    createApproval, processApproval, processBulk,
    cancelApproval, adminDeleteApproval, getAdjacentDocId,
    powerModeActive, powerModeProcessed, myPendingDocIds,
    startPowerMode, exitPowerMode, incrementPowerModeProcessed,
    tab, typeFilter, urgencyFilter, search,
    isMyTurn,
  ]);

  return (
    <ApprovalContext.Provider value={value}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApproval() {
  const ctx = useContext(ApprovalContext);
  if (!ctx) throw new Error('useApproval must be used within ApprovalProvider');
  return ctx;
}