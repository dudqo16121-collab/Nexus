import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { genDocNumber } from '../config/approvalForms';
import { useNotification } from './NotificationContext';
import { runApprovalLinkage, cleanupLinkedData } from '../utils/approvalLinkage';

const ApprovalContext = createContext(null);

// 양식 종류
export const FORM_TYPES = [
  '업무기안서',
  '지출결의서',
  '연차신청서',
  '출장신청서',
  '구매요청서',
  '품의서',
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

  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  // 필터 상태
  const [tab, setTab] = useState('all'); // all | pending_me | my_draft | approved | rejected
  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [search, setSearch] = useState('');

  // 결재자 선택용 — 관리자 목록
const [approverOptions, setApproverOptions] = useState([]);

// 결재자(관리자) 목록 로드 — 원본 loadApproverOptions()
const fetchApproverOptions = useCallback(async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, department, rank, is_admin')
    .eq('is_admin', true)
    .order('full_name');

  if (error) {
    console.error('[Approval] fetchApproverOptions error:', error);
    setApproverOptions([]);
    return;
  }

  // 본인 제외
  setApproverOptions((data || []).filter((p) => p.id !== user?.id));
}, [user]);


// 결재 처리 (승인/반려) — 원본 processApproval()
// action: 'approved' | 'rejected'
const processApproval = useCallback(
  async (docId, action, comment = '') => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };

    // 최신 문서를 다시 조회 (동시성 안전)
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

    // 권한 체크: 내가 현재 결재 차례인가
    if (apvs[step]?.id !== user.id) {
      return { ok: false, error: '현재 결재 권한이 없습니다.' };
    }

    // 현재 결재자 상태 업데이트
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
        newStatus = 'approved'; // 최종 승인
      } else {
        newStatus = 'in_progress';
        newStep = step + 1; // 다음 결재자로
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

    // 로컬 목록 동기화
    setApprovals((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, approvers: apvs, status: newStatus, current_step: newStep }
          : d
      )
    );

    /* 🔔 알림 — 상태별 분기 (올바른 변수 사용) */
    try {
      if (action === 'approved' && newStatus === 'in_progress') {
        /* 다음 결재자에게 */
        const nextApprover = apvs[newStep];
        if (nextApprover?.id) {
          createNotification({
            toUserId: nextApprover.id,
            type: 'approval',
            title: '결재 차례가 왔어요',
            body: `${doc.title} — 결재해주세요`,
            link: '/approval',
            refId: doc.id,
          });
        }
      } else if (action === 'approved' && newStatus === 'approved') {
        /* 최종 승인 — 신청자에게 */
        if (doc.drafter_id) {
          createNotification({
            toUserId: doc.drafter_id,
            type: 'approval',
            title: '결재가 완료됐어요',
            body: `${doc.title} — 최종 승인`,
            link: '/approval',
            refId: doc.id,
          });
        }
      } else if (action === 'rejected') {
        /* 반려 — 신청자에게 */
        if (doc.drafter_id) {
          createNotification({
            toUserId: doc.drafter_id,
            type: 'approval',
            title: '결재가 반려됐어요',
            body: `${doc.title}`,
            link: '/approval',
            refId: doc.id,
          });
        }
      }
    } catch (e) {
      console.error('[Approval] notification:', e);
      /* 알림 실패해도 결재 흐름은 계속 */
    }

    /* 🔗 최종 승인된 순간 — 양식에 따라 자동 연동 (휴가/출장 일정 생성) */
    let linkageResult = null;
    if (action === 'approved' && newStatus === 'approved') {
      const updatedDoc = { ...doc, approvers: apvs, status: newStatus, current_step: newStep };
      linkageResult = await runApprovalLinkage(updatedDoc);

      /* 신청자에게 자동 등록 알림 */
      if (linkageResult?.message && doc.drafter_id) {
        createNotification({
          toUserId: doc.drafter_id,
          type: 'approval',
          title: '자동 연동 완료',
          body: `${doc.title} — ${linkageResult.message}`,
          link: '/schedule',
          refId: doc.id,
        });
      }
    }

    /* 🔗 반려된 경우 — 혹시 이미 만들어둔 연관 데이터 정리 */
    if (action === 'rejected') {
      await cleanupLinkedData(docId);
    }

    // 결과 메시지 구성
    let result = { ok: true, action, newStatus, linkageResult };
    if (action === 'approved' && newStatus === 'approved') {
      result.message = {
        icon: '🎉',
        title: '최종 결재 완료!',
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

// 기안 취소 — 원본 cancelApproval()
const cancelApproval = useCallback(async (docId) => {
  const { error } = await supabase
    .from('approvals')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', docId);

  if (error) {
    console.error('[Approval] cancelApproval error:', error);
    return false;
  }

  /* 🔗 취소된 결재의 연관 일정/데이터 정리 */
  await cleanupLinkedData(docId);

  setApprovals((prev) =>
    prev.map((d) => (d.id === docId ? { ...d, status: 'canceled' } : d))
  );
  return true;
}, []);

// 관리자 영구 삭제 — 원본 adminDeleteApproval()
const adminDeleteApproval = useCallback(
  async (docId) => {
    if (profile?.is_admin !== true) {
      return { ok: false, error: '관리자만 삭제할 수 있습니다.' };
    }

    /* 🔗 결재 삭제 전 — 연관 일정도 같이 정리.
       (FK 가 ON DELETE SET NULL 이라 자동 끊기긴 하지만,
       자동 생성된 일정은 의미를 잃으니 함께 삭제) */
    await cleanupLinkedData(docId);

    const { error } = await supabase.from('approvals').delete().eq('id', docId);

    if (error) {
      console.error('[Approval] adminDeleteApproval error:', error);
      return { ok: false, error: error.message };
    }

    setApprovals((prev) => prev.filter((d) => d.id !== docId));
    return { ok: true };
  },
  [profile]
);
// 기안 생성 (임시저장 or 상신)
// status: 'draft' | 'pending'
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
    // 로컬 목록 맨 앞에 추가
    setApprovals((prev) => [
      { ...data, approvers: data.approvers || [], fields: data.fields || {} },
      ...prev,
    ]);
    return data;
  },
  [user, profile]
);

  // 목록 로드 — 원본처럼 전체를 가져와서 JS에서 필터링
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

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

  // 단일 문서 조회 (3단계 상세 뷰에서 사용)
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

  // 내가 현재 결재 차례인지 판단
  const isMyTurn = useCallback(
    (doc) => {
      if (!user) return false;
      if (doc.status !== 'pending' && doc.status !== 'in_progress') return false;
      const step = doc.current_step || 0;
      return doc.approvers?.[step]?.id === user.id;
    },
    [user]
  );

  // 필터링된 목록 — derived
  const filteredApprovals = useMemo(() => {
    let rows = [...approvals];

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

    // 양식 필터
    if (typeFilter) {
      rows = rows.filter((doc) => doc.type === typeFilter);
    }

    // 긴급도 필터
    if (urgencyFilter) {
      rows = rows.filter((doc) => doc.urgency === urgencyFilter);
    }

    // 검색 (제목 + 문서번호)
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

  // KPI 계산 — derived
  const kpi = useMemo(() => {
    const now = new Date();
    const thisMonth = (iso) => {
      const d = new Date(iso);
      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    };

    return {
      pendingMe: approvals.filter((doc) => isMyTurn(doc)).length,
      myDraft: approvals.filter(
        (doc) =>
          user &&
          doc.drafter_id === user.id &&
          ['draft', 'pending', 'in_progress'].includes(doc.status)
      ).length,
      approved: approvals.filter(
        (doc) => doc.status === 'approved' && thisMonth(doc.updated_at)
      ).length,
      rejected: approvals.filter(
        (doc) => doc.status === 'rejected' && thisMonth(doc.updated_at)
      ).length,
    };
  }, [approvals, isMyTurn, user]);

  return (
    <ApprovalContext.Provider
      value={{
        // 데이터
        approvals,
        filteredApprovals,
        loading,
        kpi,
        approverOptions,         // ⭐ 추가
        fetchApproverOptions,    // ⭐ 추가
        createApproval,
        processApproval,       // ⭐ 추가
        cancelApproval,        // ⭐ 추가
        adminDeleteApproval,
        // 필터 상태
        tab,
        typeFilter,
        urgencyFilter,
        search,
        // 액션
        fetchApprovals,
        fetchApproval,
        setTab,
        setTypeFilter,
        setUrgencyFilter,
        setSearch,
        // 유틸
        isMyTurn,
      }}
    >
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApproval() {
  const ctx = useContext(ApprovalContext);
  if (!ctx) throw new Error('useApproval must be used within ApprovalProvider');
  return ctx;
}