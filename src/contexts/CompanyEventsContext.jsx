// contexts/CompanyEventsContext.jsx
// 회사 일정 — 데이터 + CRUD.

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const CompanyEventsContext = createContext(null);

export function CompanyEventsProvider({ children }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── 로드 ── */
  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('company_events')
        .select('*')
        .order('event_date', { ascending: true });
      if (err) throw err;
      setEvents(data || []);
    } catch (e) {
      console.error('[CompanyEvents] fetch:', e);
      setError(e.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* ── 파생: 이번 달 일정 ── */
  const thisMonthEvents = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    return events.filter((e) => {
      try {
        const d = new Date(e.event_date);
        return d.getMonth() === m && d.getFullYear() === y;
      } catch { return false; }
    });
  }, [events]);

  /* ── 액션: 생성 ── */
  const createEvent = useCallback(async (payload) => {
    if (!user || !isAdmin) return { ok: false, error: '권한이 없어요.' };
    const title = (payload.title || '').trim();
    if (!title) return { ok: false, error: '제목을 입력해주세요.' };
    if (!payload.event_date) return { ok: false, error: '날짜를 선택해주세요.' };

    try {
      const row = {
        title,
        description: (payload.description || '').trim() || null,
        event_date: payload.event_date,
        end_date: payload.end_date || null,
        category: payload.category || 'announcement',
        color: payload.color || null,
        icon: payload.icon || null,
        created_by: user.id,
        created_by_name: profile?.full_name || '관리자',
      };
      const { error: err } = await supabase
        .from('company_events')
        .insert([row]);
      if (err) throw err;
      await fetchEvents();
      return { ok: true };
    } catch (e) {
      console.error('[CompanyEvents] create:', e);
      return { ok: false, error: e.message };
    }
  }, [user, profile, isAdmin, fetchEvents]);

  /* ── 액션: 수정 ── */
  const updateEvent = useCallback(async (id, patch) => {
    if (!isAdmin) return { ok: false, error: '권한이 없어요.' };
    try {
      const clean = {};
      if (typeof patch.title === 'string') clean.title = patch.title.trim();
      if (patch.description !== undefined) clean.description = (patch.description || '').trim() || null;
      if (patch.event_date !== undefined) clean.event_date = patch.event_date;
      if (patch.end_date !== undefined) clean.end_date = patch.end_date || null;
      if (patch.category !== undefined) clean.category = patch.category;
      if (patch.color !== undefined) clean.color = patch.color || null;
      if (patch.icon !== undefined) clean.icon = patch.icon || null;

      const { error: err } = await supabase
        .from('company_events')
        .update(clean)
        .eq('id', id);
      if (err) throw err;
      await fetchEvents();
      return { ok: true };
    } catch (e) {
      console.error('[CompanyEvents] update:', e);
      return { ok: false, error: e.message };
    }
  }, [isAdmin, fetchEvents]);

  /* ── 액션: 삭제 ── */
  const deleteEvent = useCallback(async (id) => {
    if (!isAdmin) return { ok: false, error: '권한이 없어요.' };
    try {
      const { error: err } = await supabase
        .from('company_events')
        .delete()
        .eq('id', id);
      if (err) throw err;
      await fetchEvents();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [isAdmin, fetchEvents]);

  const value = {
    events,
    thisMonthEvents,
    loading,
    error,
    isAdmin,
    refresh: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };

  return (
    <CompanyEventsContext.Provider value={value}>
      {children}
    </CompanyEventsContext.Provider>
  );
}

export function useCompanyEvents() {
  const ctx = useContext(CompanyEventsContext);
  if (!ctx) throw new Error('useCompanyEvents must be used within <CompanyEventsProvider>');
  return ctx;
}