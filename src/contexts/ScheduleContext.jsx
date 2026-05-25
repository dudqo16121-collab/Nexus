// contexts/ScheduleContext.jsx
// 일정 페이지 데이터 로직 — 이벤트 fetch / CRUD / 카테고리 필터.
//
// 테이블: schedule_events
//   id (uuid), title, description, start_at (timestamptz), end_at (timestamptz),
//   all_day (bool), category (text), color (text),
//   author_id, created_at, updated_at
//
// 카테고리: meeting / personal / leave / business / etc

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ScheduleContext = createContext(null);

export const CATEGORIES = [
  { id: 'meeting',  label: '회의',  color: '#4361ee' },
  { id: 'personal', label: '개인',  color: '#06d6a0' },
  { id: 'leave',    label: '휴가',  color: '#f72585' },
  { id: 'business', label: '출장',  color: '#ff9f1c' },
  { id: 'etc',      label: '기타',  color: '#8338ec' },
];

export function ScheduleProvider({ children }) {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  /* 현재 뷰 상태 */
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [currentDate, setCurrentDate] = useState(new Date());

  /* 카테고리 필터 — 비어있으면 전체 */
  const [activeCategories, setActiveCategories] = useState(
    new Set(CATEGORIES.map((c) => c.id))
  );

  /* 모달 상태 */
  const [eventModal, setEventModal] = useState({
    open: false,
    event: null,     // 수정 시 기존 이벤트, 생성 시 null
    defaultDate: null, // 빈 셀 클릭 시 자동 채울 날짜
  });

  /* 이벤트 fetch — 현재 보고 있는 기간의 +/- 한 달 정도 가져옴 */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      /* 넓게 가져와서 클라이언트에서 필터링.
         소규모 회사라 전체 fetch 도 부담 없음. */
      const { data, error } = await supabase
        .from('schedule_events')
        .select('*')
        .order('start_at', { ascending: true });
      if (error) throw error;
      setEvents(data || []);
    } catch (e) {
      console.error('[Schedule] fetchEvents:', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* 이벤트 생성 */
  const createEvent = useCallback(
    async (payload) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const row = {
          title: (payload.title || '').trim() || '새 일정',
          description: payload.description || '',
          start_at: payload.start_at,
          end_at: payload.end_at,
          all_day: !!payload.all_day,
          category: payload.category || 'etc',
          color: payload.color || CATEGORIES.find((c) => c.id === payload.category)?.color || '#4361ee',
          author_id: user.id,
        };
        const { data, error } = await supabase
          .from('schedule_events')
          .insert([row])
          .select()
          .single();
        if (error) throw error;
        setEvents((prev) => [...prev, data].sort(
          (a, b) => new Date(a.start_at) - new Date(b.start_at)
        ));
        return { ok: true, event: data };
      } catch (e) {
        console.error('[Schedule] createEvent:', e);
        return { ok: false, error: e.message || '저장 실패' };
      }
    },
    [user]
  );

  /* 이벤트 수정 */
  const updateEvent = useCallback(async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('schedule_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? data : e)).sort(
          (a, b) => new Date(a.start_at) - new Date(b.start_at)
        )
      );
      return { ok: true, event: data };
    } catch (e) {
      console.error('[Schedule] updateEvent:', e);
      return { ok: false, error: e.message || '수정 실패' };
    }
  }, []);

  /* 이벤트 삭제 */
  const deleteEvent = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('schedule_events').delete().eq('id', id);
      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== id));
      return { ok: true };
    } catch (e) {
      console.error('[Schedule] deleteEvent:', e);
      return { ok: false, error: e.message || '삭제 실패' };
    }
  }, []);

  /* 카테고리 토글 */
  const toggleCategory = useCallback((catId) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  /* 필터링된 이벤트 */
  const filteredEvents = useMemo(
    () => events.filter((e) => activeCategories.has(e.category || 'etc')),
    [events, activeCategories]
  );

  /* 모달 제어 */
  const openCreateModal = useCallback((defaultDate = null) => {
    setEventModal({ open: true, event: null, defaultDate });
  }, []);
  const openEditModal = useCallback((event) => {
    setEventModal({ open: true, event, defaultDate: null });
  }, []);
  const closeEventModal = useCallback(() => {
    setEventModal({ open: false, event: null, defaultDate: null });
  }, []);

  const canEdit = useCallback(
    (event) => event && user && event.author_id === user.id,
    [user]
  );

  const value = {
    /* 데이터 */
    events,
    filteredEvents,
    loading,
    /* 뷰 상태 */
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    /* 카테고리 */
    activeCategories,
    toggleCategory,
    /* CRUD */
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    canEdit,
    /* 모달 */
    eventModal,
    openCreateModal,
    openEditModal,
    closeEventModal,
  };

  return (
    <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider');
  return ctx;
}