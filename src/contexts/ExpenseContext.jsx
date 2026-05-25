// contexts/ExpenseContext.jsx
// 법인카드 정산 데이터 로직 단일 출처.
// 원본 script.js 의 정산 시스템 블록(loadExpensesData / saveExpenseRecord /
// deleteExpenseRecord / submitExpenseReport / cancelExpenseReport 등)을 React 상태로 이관.
//
// 설계 메모:
//  - 정산은 자체 테이블 2개(expense_records, expense_reports)를 쓴다.
//    approvals 테이블 재사용 아님 — 결재 모달도 재사용하지 않고 전용 모달 3개를 둔다.
//  - 정산 신청 시 approvals 에 기안 1건을 "선택적으로" 추가한다 (원본과 동일하게
//    실패해도 무시 — approvals 테이블/RLS 미구성 환경 대비).
//  - 원본의 데모 데이터 폴백은 옮기지 않는다. 로그인 사용자 기준으로만 동작하고,
//    비로그인/오류 시에는 빈 목록 + error 상태로 처리한다.
//  - Realtime 대신 폴링 (디버깅 메모: Realtime + StrictMode 충돌 회피).

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { genExpenseDocNumber, EXPENSE_APPROVAL_TYPE, fmtKRW } from '../config/expenseTypes';

const ExpenseContext = createContext(null);

/* 폴링 주기 — 결재/근태와 동일 톤 */
const POLL_INTERVAL = 60_000;

export function ExpenseProvider({ children }) {
  const { user, profile } = useAuth();

  /* 원본 데이터 (raw rows) */
  const [records, setRecords] = useState([]); // expense_records
  const [reports, setReports] = useState([]); // expense_reports

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* 탭 — 'records' | 'reports' (원본 expenseCurrentTab) */
  const [tab, setTab] = useState('records');

  /* 지출 내역 필터 (원본 expense-filter-* ) */
  const [recordFilters, setRecordFilters] = useState(() => {
    const d = new Date();
    return {
      category: 'all',
      status: 'all',
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      keyword: '',
    };
  });

  /* 정산 신청 내역 필터 */
  const [reportStatusFilter, setReportStatusFilter] = useState('all');

  /* ── 모달 상태 ──
     지출 등록/수정 모달: recordModal = { open, editingId|null }
     정산 신청서 모달:    reportModalOpen
     정산 상세 모달:      viewReportId | null */
  const [recordModal, setRecordModal] = useState({ open: false, editingId: null });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [viewReportId, setViewReportId] = useState(null);

  const openRecordCreate = useCallback(
    () => setRecordModal({ open: true, editingId: null }),
    []
  );
  const openRecordEdit = useCallback(
    (id) => setRecordModal({ open: true, editingId: id }),
    []
  );
  const closeRecordModal = useCallback(
    () => setRecordModal({ open: false, editingId: null }),
    []
  );
  const openReportModal = useCallback(() => setReportModalOpen(true), []);
  const closeReportModal = useCallback(() => setReportModalOpen(false), []);
  const openReportView = useCallback((id) => setViewReportId(id), []);
  const closeReportView = useCallback(() => setViewReportId(null), []);

  /* StrictMode 이중 호출 / 언마운트 후 setState 방어 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ── 데이터 로드 — 원본 loadExpensesData 이관 ──
     관리자는 전체, 일반 사용자는 본인 것만. */
  const refresh = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const isAdmin = profile?.is_admin === true;
    try {
      let q1 = supabase
        .from('expense_records')
        .select('*')
        .order('used_date', { ascending: false });
      if (!isAdmin) q1 = q1.eq('user_id', user.id);

      let q2 = supabase
        .from('expense_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (!isAdmin) q2 = q2.eq('user_id', user.id);

      const [{ data: recData, error: e1 }, { data: repData, error: e2 }] =
        await Promise.all([q1, q2]);
      if (e1) throw e1;
      if (e2) throw e2;

      if (!mountedRef.current) return;
      setRecords(recData || []);
      setReports(repData || []);
    } catch (err) {
      console.error('[ExpenseContext.refresh]', err);
      if (mountedRef.current) {
        setError(err.message || '데이터 로드 실패');
        setRecords([]);
        setReports([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, profile]);

  /* 최초 로드 + user 변경 시 재로드 */
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* 폴링 */
  useEffect(() => {
    if (!user) return;
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [user, refresh]);

  /* ── 지출 등록/수정 — 원본 saveExpenseRecord 이관 ──
     payload: { used_date, category, merchant, amount, payment_method, memo }
     editingId 가 있으면 update, 없으면 insert(status:'pending'). */
  const saveRecord = useCallback(
    async (payload, editingId) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };

      const base = {
        used_date: payload.used_date,
        category: payload.category,
        merchant: (payload.merchant || '').trim(),
        amount: Number(payload.amount),
        payment_method: payload.payment_method || '법인카드',
        memo: (payload.memo || '').trim(),
        user_name: profile?.full_name || '',
        user_dept: profile?.department || '',
        user_id: user.id,
      };

      try {
        if (editingId) {
          const { error } = await supabase
            .from('expense_records')
            .update({ ...base, updated_at: new Date().toISOString() })
            .eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('expense_records')
            .insert([{ ...base, status: 'pending' }]);
          if (error) throw error;
        }
        await refresh();
        return { ok: true, editing: !!editingId };
      } catch (err) {
        console.error('[ExpenseContext.saveRecord]', err);
        return { ok: false, error: err.message };
      }
    },
    [user, profile, refresh]
  );

  /* ── 지출 삭제 — 원본 deleteExpenseRecord 이관 ── */
  const deleteRecord = useCallback(
    async (id) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { error } = await supabase
          .from('expense_records')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await refresh();
        return { ok: true };
      } catch (err) {
        console.error('[ExpenseContext.deleteRecord]', err);
        return { ok: false, error: err.message };
      }
    },
    [user, refresh]
  );

  /* ── 정산 신청 — 원본 submitExpenseReport 이관 ──
     1) expense_reports insert
     2) 선택된 records → status:'submitted' + report_id 연결
     3) (선택) approvals 테이블에 기안 1건 추가 — 실패해도 무시
     selectedIds: string[] (expense_records.id)
     meta: { title, note } */
  const submitReport = useCallback(
    async (selectedIds, meta) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      if (!selectedIds || selectedIds.length === 0) {
        return { ok: false, error: '정산할 지출을 1건 이상 선택해주세요.' };
      }

      const selectedRecs = records.filter((r) => selectedIds.includes(r.id));
      const totalAmount = selectedRecs.reduce(
        (s, r) => s + Number(r.amount || 0),
        0
      );
      const docNumber = genExpenseDocNumber();

      const reportPayload = {
        doc_number: docNumber,
        title: (meta.title || '').trim(),
        total_amount: totalAmount,
        record_count: selectedRecs.length,
        note: (meta.note || '').trim(),
        status: 'pending',
        user_id: user.id,
        user_name: profile?.full_name || '',
        user_dept: profile?.department || '',
        submitted_at: new Date().toISOString(),
      };

      try {
        // 1) 정산 신청서 insert
        const { data: inserted, error: e1 } = await supabase
          .from('expense_reports')
          .insert([reportPayload])
          .select()
          .single();
        if (e1) throw e1;

        const reportId = inserted.id;

        // 2) 선택된 지출 → submitted + report_id 연결
        const { error: e2 } = await supabase
          .from('expense_records')
          .update({
            status: 'submitted',
            report_id: reportId,
            updated_at: new Date().toISOString(),
          })
          .in('id', selectedIds);
        if (e2) throw e2;

        // 3) (선택) 전자결재 연동 — 실패해도 무시 (원본과 동일)
        try {
          await supabase.from('approvals').insert([
            {
              doc_number: docNumber,
              type: EXPENSE_APPROVAL_TYPE,
              title: `[법인카드정산] ${reportPayload.title}`,
              body: `정산 총액: ${fmtKRW(totalAmount)}\n정산 건수: ${
                selectedRecs.length
              }건\n\n${reportPayload.note}`,
              note: reportPayload.note,
              urgency: '일반',
              status: 'pending',
              drafter_id: user.id,
              drafter_name: profile?.full_name || '',
              drafter_dept: profile?.department || '',
              fields: {
                expense_report_id: reportId,
                total_amount: totalAmount,
                record_count: selectedRecs.length,
              },
              approvers: [],
              current_step: 0,
            },
          ]);
        } catch (apprErr) {
          console.warn('[ExpenseContext] approvals 연동 실패:', apprErr.message);
        }

        await refresh();
        return { ok: true, docNumber };
      } catch (err) {
        console.error('[ExpenseContext.submitReport]', err);
        return { ok: false, error: err.message };
      }
    },
    [user, profile, records, refresh]
  );

  /* ── 정산 신청 취소 — 원본 cancelExpenseReport 이관 ──
     1) 정산서 status → canceled
     2) 연결된 지출 → status:'pending' 복원 + report_id 해제 */
  const cancelReport = useCallback(
    async (reportId) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { error: e1 } = await supabase
          .from('expense_reports')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('id', reportId);
        if (e1) throw e1;

        const { error: e2 } = await supabase
          .from('expense_records')
          .update({
            status: 'pending',
            report_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('report_id', reportId);
        if (e2) throw e2;

        await refresh();
        return { ok: true };
      } catch (err) {
        console.error('[ExpenseContext.cancelReport]', err);
        return { ok: false, error: err.message };
      }
    },
    [user, refresh]
  );

  /* 특정 정산서에 포함된 지출 내역 조회 (상세 모달용).
     캐시에 없으면 DB 직접 조회 — 원본 openExpenseReportView 의 폴백 이관. */
  const getReportRecords = useCallback(
    async (reportId) => {
      const cached = records.filter((r) => r.report_id === reportId);
      if (cached.length > 0) return cached;
      try {
        const { data } = await supabase
          .from('expense_records')
          .select('*')
          .eq('report_id', reportId)
          .order('used_date', { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
    [records]
  );

  /* ── 파생 데이터: 통계 위젯 — 원본 renderExpenseStats 이관 ── */
  const stats = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sum = (arr) => arr.reduce((s, r) => s + Number(r.amount || 0), 0);

    const thisMonth = records.filter((r) => (r.used_date || '').startsWith(ym));
    const pending = records.filter((r) => r.status === 'pending');
    const submitted = records.filter((r) => r.status === 'submitted');
    const doneThisMonth = thisMonth.filter((r) => r.status === 'approved');

    return {
      month: { total: sum(thisMonth), count: thisMonth.length },
      pending: { total: sum(pending), count: pending.length },
      progress: { total: sum(submitted), count: submitted.length },
      done: { total: sum(doneThisMonth), count: doneThisMonth.length },
    };
  }, [records]);

  /* ── 파생 데이터: 카테고리별 이번달 지출 (차트용) — 원본 renderExpenseCategoryChart ── */
  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthRecs = records.filter((r) => (r.used_date || '').startsWith(ym));

    const sums = {};
    monthRecs.forEach((r) => {
      sums[r.category] = (sums[r.category] || 0) + Number(r.amount || 0);
    });
    // [{ category, amount }] — 금액 내림차순
    return Object.entries(sums)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [records]);

  /* ── 파생 데이터: 필터 적용된 지출 내역 — 원본 renderExpenseRecords ── */
  const filteredRecords = useMemo(() => {
    const { category, status, month, keyword } = recordFilters;
    let list = [...records];
    if (category !== 'all') list = list.filter((r) => r.category === category);
    if (status !== 'all') list = list.filter((r) => r.status === status);
    if (month) list = list.filter((r) => (r.used_date || '').startsWith(month));
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.merchant || '').toLowerCase().includes(kw) ||
          (r.memo || '').toLowerCase().includes(kw)
      );
    }
    return list;
  }, [records, recordFilters]);

  /* ── 파생 데이터: 필터 적용된 정산 신청 내역 — 원본 renderExpenseReports ── */
  const filteredReports = useMemo(() => {
    if (reportStatusFilter === 'all') return reports;
    return reports.filter((r) => r.status === reportStatusFilter);
  }, [reports, reportStatusFilter]);

  /* 정산 신청 가능한(=pending) 지출 — 정산 신청서 모달에서 선택 대상 */
  const pendingRecords = useMemo(
    () => records.filter((r) => r.status === 'pending'),
    [records]
  );

  const value = {
    // 원본 데이터
    records,
    reports,
    loading,
    error,
    refresh,
    // 탭 / 필터
    tab,
    setTab,
    recordFilters,
    setRecordFilters,
    reportStatusFilter,
    setReportStatusFilter,
    // 파생 데이터
    stats,
    categoryBreakdown,
    filteredRecords,
    filteredReports,
    pendingRecords,
    // CRUD / 액션
    saveRecord,
    deleteRecord,
    submitReport,
    cancelReport,
    getReportRecords,
    // 모달 상태 + 액션
    recordModal,
    openRecordCreate,
    openRecordEdit,
    closeRecordModal,
    reportModalOpen,
    openReportModal,
    closeReportModal,
    viewReportId,
    openReportView,
    closeReportView,
  };

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
}

export function useExpense() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return ctx;
}
