// contexts/OrgChartContext.jsx
// 조직도 — 코맨드 센터 (KPI + 필터 + 부서색).

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const OrgChartContext = createContext(null);

/* 부서별 색상 매핑 — 미리 정의된 부서명 우선, 나머지는 자동 배정 */
const DEPT_COLOR_PRESETS = {
  '디자인팀': { color: '#f72585', icon: 'fa-palette' },
  '디자인':   { color: '#f72585', icon: 'fa-palette' },
  '개발팀':   { color: '#4361ee', icon: 'fa-code' },
  '개발':     { color: '#4361ee', icon: 'fa-code' },
  '마케팅팀': { color: '#ff9f1c', icon: 'fa-bullhorn' },
  '마케팅':   { color: '#ff9f1c', icon: 'fa-bullhorn' },
  '영업팀':   { color: '#06d6a0', icon: 'fa-handshake' },
  '영업':     { color: '#06d6a0', icon: 'fa-handshake' },
  '인사팀':   { color: '#8338ec', icon: 'fa-user-tie' },
  '인사':     { color: '#8338ec', icon: 'fa-user-tie' },
  '경영지원': { color: '#06b6d4', icon: 'fa-briefcase' },
  '경영':     { color: '#06b6d4', icon: 'fa-briefcase' },
  '운영팀':   { color: '#64748b', icon: 'fa-gear' },
  '운영':     { color: '#64748b', icon: 'fa-gear' },
  '기획팀':   { color: '#a855f7', icon: 'fa-lightbulb' },
  '기획':     { color: '#a855f7', icon: 'fa-lightbulb' },
  '미지정':   { color: '#94a3b8', icon: 'fa-folder' },
};

/* 자동 색상 생성 (이름 해시 기반) */
const FALLBACK_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#d946ef'];
function getDeptMeta(deptName) {
  if (DEPT_COLOR_PRESETS[deptName]) return DEPT_COLOR_PRESETS[deptName];
  /* 이름 해시로 색상 결정 (안정적) */
  let hash = 0;
  for (let i = 0; i < deptName.length; i++) {
    hash = ((hash << 5) - hash) + deptName.charCodeAt(i);
    hash |= 0;
  }
  return {
    color: FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length],
    icon: 'fa-building',
  };
}

export function OrgChartProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);
  /* 🆕 KPI 필터 — 'birthday' | 'new_joiner' | 'admin' | null */
  const [quickFilter, setQuickFilter] = useState(null);

  const [viewMode, setViewMode] = useState(() => {
  return localStorage.getItem('nexus_orgchart_view') || 'grid';
  }); // 'grid' | 'list' | 'tree'

  /* 멤버 모달 */
  const [detailModal, setDetailModal] = useState({ open: false, member: null });

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, full_name, department, position, avatar_url, phone, status_msg, is_admin, birthday, hired_at, email')
        .order('full_name', { ascending: true });
      if (err) throw err;
      setMembers(data || []);
    } catch (e) {
      console.error('[OrgChart] fetch:', e);
      setError(e.message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /* 뷰 모드 localStorage 저장 */
useEffect(() => {
  localStorage.setItem('nexus_orgchart_view', viewMode);
}, [viewMode]);

  /* 부서별 그룹 + 색상 메타 */
  const departments = useMemo(() => {
    const map = new Map();
    for (const m of members) {
      const dept = (m.department || '미지정').trim() || '미지정';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept).push(m);
    }
    return Array.from(map.entries())
      .map(([name, list]) => ({
        name,
        members: list,
        ...getDeptMeta(name),
      }))
      .sort((a, b) => {
        if (a.name === '미지정') return 1;
        if (b.name === '미지정') return -1;
        return b.members.length - a.members.length; // 인원 많은 순
      });
  }, [members]);

  /* 🆕 KPI 통계 */
  const kpi = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    /* 이번 달 생일자 */
    const birthdayThisMonth = members.filter((m) => {
      if (!m.birthday) return false;
      return new Date(m.birthday).getMonth() === thisMonth;
    });

    /* 신규 입사자 (최근 3개월) */
    const newJoiners = members.filter((m) => {
      if (!m.hired_at) return false;
      return new Date(m.hired_at) >= threeMonthsAgo;
    });

    /* 관리자 */
    const admins = members.filter((m) => m.is_admin);

    /* 오늘 생일자 */
    const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const birthdayToday = members.filter((m) => {
      if (!m.birthday) return false;
      const d = new Date(m.birthday);
      const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return md === today;
    });

    return {
      total: members.length,
      deptCount: departments.length,
      birthdayThisMonth: birthdayThisMonth.length,
      birthdayToday: birthdayToday.length,
      newJoiners: newJoiners.length,
      admins: admins.length,
      /* ID 목록 (필터용) */
      birthdayIds: new Set(birthdayThisMonth.map((m) => m.id)),
      newJoinerIds: new Set(newJoiners.map((m) => m.id)),
      adminIds: new Set(admins.map((m) => m.id)),
    };
  }, [members, departments]);

  /* 검색 + 부서 + 퀵필터 적용 */
  const filteredMembers = useMemo(() => {
    let list = members;
    if (selectedDept) {
      list = list.filter((m) => (m.department || '미지정') === selectedDept);
    }
    if (quickFilter === 'birthday') {
      list = list.filter((m) => kpi.birthdayIds.has(m.id));
    } else if (quickFilter === 'new_joiner') {
      list = list.filter((m) => kpi.newJoinerIds.has(m.id));
    } else if (quickFilter === 'admin') {
      list = list.filter((m) => kpi.adminIds.has(m.id));
    }
    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter((m) =>
        (m.full_name || '').toLowerCase().includes(kw) ||
        (m.department || '').toLowerCase().includes(kw) ||
        (m.phone || '').toLowerCase().includes(kw) ||
        (m.position || '').toLowerCase().includes(kw) ||
        (m.status_msg || '').toLowerCase().includes(kw)
      );
    }
    return list;
  }, [members, selectedDept, quickFilter, search, kpi]);

  /* 부서 메타 조회 헬퍼 */
  const getDeptInfo = useCallback((deptName) => {
    return getDeptMeta((deptName || '미지정').trim());
  }, []);

  const openDetail = useCallback((member) => {
    setDetailModal({ open: true, member });
  }, []);
  const closeDetail = useCallback(() => {
    setDetailModal({ open: false, member: null });
  }, []);

  /* 필터 초기화 */
  const resetFilters = useCallback(() => {
    setSearch('');
    setSelectedDept(null);
    setQuickFilter(null);
  }, []);

  const hasActiveFilter = !!search || !!selectedDept || !!quickFilter;

  return (
    <OrgChartContext.Provider
      value={{
        members,
        departments,
        filteredMembers,
        loading,
        error,
        search, setSearch,
        selectedDept, setSelectedDept,
        quickFilter, setQuickFilter,
        kpi,
        detailModal,
        openDetail, closeDetail,
        getDeptInfo,
        resetFilters,
        hasActiveFilter,
        fetchMembers,
        viewMode,
        setViewMode,
      }}
    >
      {children}
    </OrgChartContext.Provider>
  );
}

export function useOrgChart() {
  const ctx = useContext(OrgChartContext);
  if (!ctx) throw new Error('useOrgChart must be used within OrgChartProvider');
  return ctx;
}