// contexts/AdminContext.jsx
// 시스템 관리 데이터 로직 단일 출처.
// 원본 script.js 17번(Admin System) 블록 중 사용자/근태/모니터링 로직을
// React 상태로 이관.
//
// 설계 메모:
//  - 회의실 관리 탭은 MeetingRoomContext 의 rooms/addRoom/deleteRoom 을 재사용한다.
//    이 Context 에는 회의실 로직을 중복 구현하지 않는다.
//  - 자산/환경설정 탭은 원본에 실제 기능이 없어 마이그레이션 범위에서 제외.
//  - 근태 초기화(delete)는 영구 삭제이므로, 이 Context 는 함수만 제공하고
//    실제 호출은 UI 컴포넌트에서 사용자 confirm 을 거친 뒤에만 일어난다.
//  - 탭이 활성화될 때 해당 데이터를 로드하는 방식 (원본 setupAdminMenu 의
//    탭 클릭 시 load 호출과 동일). 페이지에서 활성 탭에 맞춰 load 함수를 호출한다.
//  - Realtime 대신 명시적 refetch (디버깅 메모: Realtime + StrictMode 충돌 회피).

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const AdminContext = createContext(null);

/* 오늘 날짜 YYYY-MM-DD — attendance.created_at(date) 비교용 */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AdminProvider({ children }) {
  const { user, profile, refreshProfile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  /* ── 사용자 관리 (tab-users) ── */
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);

  /* 사용자 정보 수정 모달 상태 */
  const [userEditModal, setUserEditModal] = useState({
    open: false,
    target: null, // { id, full_name, department }
  });
  const openUserEdit = useCallback(
    (target) => setUserEditModal({ open: true, target }),
    []
  );
  const closeUserEdit = useCallback(
    () => setUserEditModal({ open: false, target: null }),
    []
  );

  /* ── 근태/업무 통계 (tab-attendance) ── */
  const [attendanceRows, setAttendanceRows] = useState([]); // [{ profile, record }]
  const [attendanceKpi, setAttendanceKpi] = useState({
    attended: 0,
    total: 0,
    absent: 0,
    checkout: 0,
  });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);

  /* ── 시스템 모니터링 (tab-monitoring) ── */
  const [monitoring, setMonitoring] = useState({
    activeSessions: 0,
    totalPosts: 0,
    totalFiles: 0,
  });
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringLogs, setMonitoringLogs] = useState([]); // [{ level, text }]

  /* StrictMode 이중 호출 / 언마운트 후 setState 방어 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ── 사용자 목록 로드 — 원본 loadAdminUsers 이관 ── */
  const loadUsers = useCallback(async () => {
    if (!user) {
      setUsers([]);
      return;
    }
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;
      if (!mountedRef.current) return;
      setUsers(data || []);
    } catch (err) {
      console.error('[AdminContext.loadUsers]', err);
      if (mountedRef.current) {
        setUsersError(err.message || '데이터를 불러오지 못했습니다.');
        setUsers([]);
      }
    } finally {
      if (mountedRef.current) setUsersLoading(false);
    }
  }, [user]);
const updateUser = useCallback(async (userId, patch) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);
    if (error) throw error;

    /* 로컬 상태 동기화 */
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...patch } : u))
    );

    return { ok: true };
  } catch (e) {
    console.error('[Admin.updateUser]', e);
    return { ok: false, error: e.message };
  }
}, []);

/* 관리자 권한 토글 */
const toggleAdmin = useCallback(async (userId, isAdmin) => {
  return updateUser(userId, { is_admin: isAdmin });
}, [updateUser]);

/* 계정 활성/비활성 토글 */
const toggleActive = useCallback(async (userId, isActive) => {
  return updateUser(userId, { is_active: isActive });
}, [updateUser]);

/* 일괄 부서 변경 */
const bulkUpdateDepartment = useCallback(async (userIds, department) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ department })
      .in('id', userIds);
    if (error) throw error;

    setUsers((prev) =>
      prev.map((u) =>
        userIds.includes(u.id) ? { ...u, department } : u
      )
    );

    return { ok: true, count: userIds.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}, []);
  /* ── 사용자 정보 수정 — 원본 saveAdminUserEdit 이관 ──
     이름/부서만 수정. 권한(is_admin) 변경은 원본에도 없으므로 다루지 않는다. */
  const saveUserEdit = useCallback(
    async (id, { full_name, department }) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: (full_name || '').trim(),
            department: (department || '').trim(),
          })
          .eq('id', id);
        if (error) throw error;

        await loadUsers();
        // 본인 정보를 수정한 경우 AuthContext 프로필도 갱신
        if (user.id === id && typeof refreshProfile === 'function') {
          refreshProfile();
        }
        return { ok: true };
      } catch (err) {
        console.error('[AdminContext.saveUserEdit]', err);
        return {
          ok: false,
          error: err.message || '수정에 실패했습니다. (권한을 확인하세요)',
        };
      }
    },
    [user, loadUsers, refreshProfile]
  );

  /* ── 금일 근태 현황 로드 — 원본 loadAdminAttendance 이관 ──
     전 직원(profiles) × 오늘 attendance 를 조인해서 행 구성 + KPI 계산. */
  const loadAttendance = useCallback(async () => {
    if (!user) {
      setAttendanceRows([]);
      setAttendanceKpi({ attended: 0, total: 0, absent: 0, checkout: 0 });
      return;
    }
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const [{ data: profiles, error: pErr }, { data: logs, error: aErr }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, department')
            .order('full_name', { ascending: true }),
          supabase.from('attendance').select('*').eq('created_at', todayStr()),
        ]);
      if (pErr) throw pErr;
      if (aErr) throw aErr;

      const logList = logs || [];
      let attended = 0;
      let checkout = 0;

      const rows = (profiles || []).map((emp) => {
        const record = logList.find((l) => l.user_id === emp.id) || null;
        if (record) {
          attended += 1;
          if (record.check_out) checkout += 1;
        }
        return { profile: emp, record };
      });

      const total = profiles?.length || 0;

      if (!mountedRef.current) return;
      setAttendanceRows(rows);
      setAttendanceKpi({
        attended,
        total,
        absent: total - attended,
        checkout,
      });
    } catch (err) {
      console.error('[AdminContext.loadAttendance]', err);
      if (mountedRef.current) {
        setAttendanceError(err.message || '데이터 로드 실패');
        setAttendanceRows([]);
      }
    } finally {
      if (mountedRef.current) setAttendanceLoading(false);
    }
  }, [user]);

  /* ── 개별 근태 초기화 — 원본 resetSingleAttendance 이관 ──
     영구 삭제. UI 에서 사용자 confirm 후에만 호출할 것.
     attendance_no(PK) 기준 삭제. */
  const resetSingleAttendance = useCallback(
    async (attendanceNo) => {
      if (!isAdmin) {
        return { ok: false, error: '관리자만 초기화할 수 있습니다.' };
      }
      try {
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('attendance_no', attendanceNo);
        if (error) throw error;
        await loadAttendance();
        return { ok: true };
      } catch (err) {
        console.error('[AdminContext.resetSingleAttendance]', err);
        return { ok: false, error: err.message };
      }
    },
    [isAdmin, loadAttendance]
  );

  /* ── 금일 근태 전체 초기화 — 원본 confirmResetAttendance 이관 ──
     영구 삭제. UI 에서 사용자 confirm 후에만 호출할 것.
     오늘 날짜(created_at) 의 attendance 전체 삭제. */
  const resetAllAttendance = useCallback(async () => {
    if (!isAdmin) {
      return { ok: false, error: '관리자만 초기화할 수 있습니다.' };
    }
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('created_at', todayStr());
      if (error) throw error;
      await loadAttendance();
      return { ok: true };
    } catch (err) {
      console.error('[AdminContext.resetAllAttendance]', err);
      return { ok: false, error: err.message };
    }
  }, [isAdmin, loadAttendance]);

  /* ── 시스템 모니터링 로드 — 원본 startMonitoringSimulation 이관 ──
     활성 세션(오늘 출근 후 미퇴근) / 누적 게시글 / 자료실 파일 수. */
  const loadMonitoring = useCallback(async () => {
    if (!user) return;
    setMonitoringLoading(true);
    setMonitoringLogs([{ level: 'info', text: '시스템 모니터링 데이터 동기화 중...' }]);
    try {
      const [
        { count: activeSessions, error: e1 },
        { count: totalPosts, error: e2 },
        { count: totalFiles, error: e3 },
      ] = await Promise.all([
        supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('created_at', todayStr())
          .is('check_out', null),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('resources').select('*', { count: 'exact', head: true }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      if (!mountedRef.current) return;
      setMonitoring({
        activeSessions: activeSessions || 0,
        totalPosts: totalPosts || 0,
        totalFiles: totalFiles || 0,
      });
      setMonitoringLogs([
        { level: 'info', text: 'DB 접속 상태 정상.' },
        {
          level: 'info',
          text: `데이터 로드 완료: 활성 사용자 ${activeSessions || 0}명`,
        },
      ]);
    } catch (err) {
      console.error('[AdminContext.loadMonitoring]', err);
      if (mountedRef.current) {
        setMonitoringLogs((prev) => [
          ...prev,
          { level: 'error', text: `데이터 로드 실패: ${err.message}` },
        ]);
      }
    } finally {
      if (mountedRef.current) setMonitoringLoading(false);
    }
  }, [user]);

  const value = {
    isAdmin,
    // 사용자 관리
    users,
    usersLoading,
    usersError,
    loadUsers,
    saveUserEdit,
    userEditModal,
    openUserEdit,
    closeUserEdit,
    // 근태/업무 통계
    attendanceRows,
    attendanceKpi,
    attendanceLoading,
    attendanceError,
    loadAttendance,
    resetSingleAttendance,
    resetAllAttendance,
    // 시스템 모니터링
    monitoring,
    monitoringLoading,
    monitoringLogs,
    loadMonitoring,
    updateUser,
    toggleAdmin,
    toggleActive,
    bulkUpdateDepartment,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return ctx;
}