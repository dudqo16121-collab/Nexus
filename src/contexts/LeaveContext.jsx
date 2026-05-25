// contexts/LeaveContext.jsx
// 근태/연차 데이터 로직 단일 출처.
// 원본 script.js 13-A 블록(loadLeaveData / _renderLeaveSummary /
// _renderAttendanceSummary / _renderLeaveHistory)을 React 상태로 이관.
//
// 설계 메모:
//  - useLeaveData.js 는 사용하지 않고 이 Context 에 전부 구현 (요청사항).
//  - Supabase Realtime 은 Strict Mode 와 충돌하므로 폴링으로 회피 (디버깅 메모 준수).
//  - 휴가 신청 자체는 ApprovalContext 의 작성 모달을 재사용한다. 이 Context 는
//    approvals 테이블에서 '연차신청서' 건을 읽어오기만 한다.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
  LEAVE_POLICY,
  LEAVE_FORM_TYPE,
  leaveDaysFromFields,
} from '../config/leaveTypes';

const LeaveContext = createContext(null);

/* 근태 요약 폴링 주기 — 결재 badge(30초)와 동일 톤 */
const POLL_INTERVAL = 60_000;

export function LeaveProvider({ children }) {
  const { user } = useAuth();

  /* 선택된 연도 (휴가 신청 내역 필터) */
  const [year, setYear] = useState(() => new Date().getFullYear());

  /* 휴가 신청 내역 (approvals 테이블 raw rows) */
  const [leaveDocs, setLeaveDocs] = useState([]);

  /* 연차 요약 — 총 발생 / 사용 / 대기 / 잔여 */
  const [summary, setSummary] = useState({
    total: LEAVE_POLICY.DEFAULT_ANNUAL_DAYS,
    used: 0,
    pending: 0,
    remaining: LEAVE_POLICY.DEFAULT_ANNUAL_DAYS,
  });

  /* 이번달 근태 요약 — 출근일수 / 정상 / 지각 / 평균근무시간 */
  const [attendance, setAttendance] = useState({
    workDays: 0,
    normalDays: 0,
    lateDays: 0,
    avgHours: 0,
    monthLabel: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── 모달 상태 ──
     휴가 신청은 결재 기안작성모달(ApprovalWriteModal)을 재사용하고,
     휴가 내역 상세는 결재 상세모달(ApprovalViewModal)을 재사용한다.
     원본 openLeaveModal / openApprovalView 의 역할을 이 상태들이 대신한다.
     모달 컴포넌트 자체는 Leave.jsx 에서 렌더링한다. */
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [viewModalDocId, setViewModalDocId] = useState(null);

  /* 휴가 신청 모달 열기 — 원본 openLeaveModal 대응.
     ApprovalWriteModal 에 initialType='연차신청서' 를 넘겨 양식이 자동 선택된다. */
  const openLeaveWrite = useCallback(() => setWriteModalOpen(true), []);
  const closeLeaveWrite = useCallback(() => setWriteModalOpen(false), []);

  /* 휴가 내역 상세 모달 열기/닫기 — 원본 openApprovalView 대응 */
  const openLeaveDetail = useCallback((docId) => setViewModalDocId(docId), []);
  const closeLeaveDetail = useCallback(() => setViewModalDocId(null), []);

  /* StrictMode 이중 호출 / 언마운트 후 setState 방어 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ── 총 발생 연차 조회 (profiles 우선, 없으면 정책값) ──
     원본 loadLeaveData 의 (2) 블록 이관 */
  const fetchTotalDays = useCallback(async () => {
    let totalDays = LEAVE_POLICY.DEFAULT_ANNUAL_DAYS;
    if (!LEAVE_POLICY.USE_PROFILE_FIELD || !user) return totalDays;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('annual_leave_days')
        .eq('id', user.id)
        .maybeSingle();
      if (prof && typeof prof.annual_leave_days === 'number') {
        totalDays = prof.annual_leave_days;
      }
    } catch (_) {
      /* 컬럼이 없으면 정책 기본값 유지 — 원본과 동일하게 조용히 무시 */
    }
    return totalDays;
  }, [user]);

  /* ── 휴가 신청 내역 + 연차 요약 로드 ──
     원본 loadLeaveData 의 (1)(3) 블록 이관 */
  const loadLeaveDocs = useCallback(
    async (targetYear) => {
      if (!user) {
        // 미로그인 — 원본과 동일하게 기본값
        setLeaveDocs([]);
        setSummary({
          total: LEAVE_POLICY.DEFAULT_ANNUAL_DAYS,
          used: 0,
          pending: 0,
          remaining: LEAVE_POLICY.DEFAULT_ANNUAL_DAYS,
        });
        return;
      }

      const yearStart = `${targetYear}-01-01T00:00:00`;
      const yearEnd = `${targetYear}-12-31T23:59:59`;

      const { data: docs, error: docsErr } = await supabase
        .from('approvals')
        .select('*')
        .eq('drafter_id', user.id)
        .eq('type', LEAVE_FORM_TYPE)
        .gte('created_at', yearStart)
        .lte('created_at', yearEnd)
        .order('created_at', { ascending: false });
      if (docsErr) throw docsErr;

      const totalDays = await fetchTotalDays();

      /* 사용/대기 일수 집계 — 원본 forEach 로직 이관 */
      let usedDays = 0;
      let pendingDays = 0;
      (docs || []).forEach((d) => {
        const days = leaveDaysFromFields(d.fields);
        if (d.status === 'approved') usedDays += days;
        else if (d.status === 'pending') pendingDays += days;
      });

      if (!mountedRef.current) return;
      setLeaveDocs(docs || []);
      setSummary({
        total: totalDays,
        used: usedDays,
        pending: pendingDays,
        remaining: Math.max(0, totalDays - usedDays - pendingDays),
      });
    },
    [user, fetchTotalDays]
  );

  /* ── 이번달 근태 요약 로드 ──
     원본 loadLeaveData (4) + _renderAttendanceSummary 이관.
     주의: attendance.created_at 은 date 타입이고 KST 기준으로 저장됨. */
  const loadAttendance = useCallback(async () => {
    const now = new Date();
    const monthLabel = `(${now.getFullYear()}.${String(
      now.getMonth() + 1
    ).padStart(2, '0')})`;

    if (!user) {
      if (mountedRef.current) {
        setAttendance({
          workDays: 0,
          normalDays: 0,
          lateDays: 0,
          avgHours: 0,
          monthLabel,
        });
      }
      return;
    }

    const m = now.getMonth();
    const yyyy = now.getFullYear();
    const monthStart = `${yyyy}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(yyyy, m + 1, 0).getDate();
    const monthEnd = `${yyyy}-${String(m + 1).padStart(2, '0')}-${String(
      lastDay
    ).padStart(2, '0')}`;

    const { data: rows, error: attErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd);
    if (attErr) throw attErr;

    const list = rows || [];
    const workDays = list.filter((r) => r.check_in).length;
    const normalDays = list.filter((r) => r.status === '정상').length;
    const lateDays = list.filter((r) => r.status === '지각').length;

    /* 평균 근무시간 — check_out 이 있는 날만 (원본 동일) */
    const closed = list.filter((r) => r.check_in && r.check_out);
    let avgHours = 0;
    if (closed.length > 0) {
      const totalMs = closed.reduce(
        (sum, r) => sum + (new Date(r.check_out) - new Date(r.check_in)),
        0
      );
      avgHours = totalMs / closed.length / 3_600_000;
    }

    if (!mountedRef.current) return;
    setAttendance({ workDays, normalDays, lateDays, avgHours, monthLabel });
  }, [user]);

  /* ── 전체 새로고침 — 원본 loadLeaveData 진입점 대응 ── */
  const refresh = useCallback(
    async (targetYear = year) => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadLeaveDocs(targetYear), loadAttendance()]);
      } catch (err) {
        console.error('[LeaveContext.refresh]', err);
        if (mountedRef.current) {
          setError(err.message || '데이터 로드 실패');
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [year, loadLeaveDocs, loadAttendance]
  );

  /* 연도 변경 시 자동 재로드 — 원본 select onchange="loadLeaveData()" 대응 */
  useEffect(() => {
    refresh(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, user]);

  /* 폴링 — Realtime 대신 (디버깅 메모: Realtime + StrictMode 충돌 회피) */
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      refresh(year);
    }, POLL_INTERVAL);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year]);

  const value = {
    year,
    setYear,
    leaveDocs,
    summary,
    attendance,
    loading,
    error,
    refresh,
    // 모달 상태 + 액션 (휴가 신청 / 휴가 내역 상세)
    writeModalOpen,
    openLeaveWrite,
    closeLeaveWrite,
    viewModalDocId,
    openLeaveDetail,
    closeLeaveDetail,
  };

  return (
    <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>
  );
}

export function useLeave() {
  const ctx = useContext(LeaveContext);
  if (!ctx) {
    throw new Error('useLeave must be used within a LeaveProvider');
  }
  return ctx;
}