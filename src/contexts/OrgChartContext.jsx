// contexts/OrgChartContext.jsx
// 조직도 데이터 — profiles 테이블 fetch + 부서별 그룹핑 + 검색/필터.

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const OrgChartContext = createContext(null);

export function OrgChartProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState(null); // null = 전체

  /* 멤버 모달 */
  const [detailModal, setDetailModal] = useState({ open: false, member: null });

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, full_name, department, avatar_url, phone, status_msg, is_admin')
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

  /* 부서별 그룹 */
  const departments = useMemo(() => {
    const map = new Map();
    for (const m of members) {
      const dept = (m.department || '미지정').trim() || '미지정';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept).push(m);
    }
    /* 이름순으로 정렬해서 부서 목록 반환 */
    return Array.from(map.entries())
      .map(([name, list]) => ({ name, members: list }))
      .sort((a, b) => {
        // '미지정' 은 뒤로
        if (a.name === '미지정') return 1;
        if (b.name === '미지정') return -1;
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [members]);

  /* 검색 + 부서 필터 적용된 멤버 목록 */
  const filteredMembers = useMemo(() => {
    let list = members;
    if (selectedDept) {
      list = list.filter((m) => (m.department || '미지정') === selectedDept);
    }
    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (m) =>
          (m.full_name || '').toLowerCase().includes(kw) ||
          (m.department || '').toLowerCase().includes(kw)
      );
    }
    return list;
  }, [members, selectedDept, search]);

  const openDetail = useCallback((member) => {
    setDetailModal({ open: true, member });
  }, []);
  const closeDetail = useCallback(() => {
    setDetailModal({ open: false, member: null });
  }, []);

  return (
    <OrgChartContext.Provider
      value={{
        members,
        departments,
        filteredMembers,
        loading,
        error,
        search,
        setSearch,
        selectedDept,
        setSelectedDept,
        detailModal,
        openDetail,
        closeDetail,
        fetchMembers,
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