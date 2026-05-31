// contexts/StandupContext.jsx
// 일일 스탠드업 — 어제 한 일 / 오늘 할 일 / 블로커.

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const StandupContext = createContext(null);

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function StandupProvider({ children }) {
  const { user, profile } = useAuth();

  const [standups, setStandups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  /* 오늘 + 최근 며칠 전체 로드 */
  const fetchStandups = useCallback(async () => {
    setLoading(true);
    try {
      // 최근 7일치만
      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceStr = since.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('daily_standups')
        .select('*')
        .gte('standup_date', sinceStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStandups(data || []);
    } catch (e) {
      console.error('[Standup] fetchStandups:', e);
      setStandups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchStandups();
  }, [user, fetchStandups]);

  /* 오늘 스탠드업들 */
  const todayStandups = useMemo(() => {
    const t = todayStr();
    return standups.filter((s) => s.standup_date === t);
  }, [standups]);

  /* 내 오늘 스탠드업 */
  const myToday = useMemo(() => {
    if (!user) return null;
    return todayStandups.find((s) => s.user_id === user.id) || null;
  }, [todayStandups, user]);

  /* 작성/수정 (upsert) */
  const saveStandup = useCallback(
    async ({ yesterday, today, blocker }) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };

      const payload = {
        user_id: user.id,
        user_name: profile?.full_name || '동료',
        department: profile?.department || '',
        standup_date: todayStr(),
        yesterday: (yesterday || '').trim(),
        today: (today || '').trim(),
        blocker: (blocker || '').trim(),
        updated_at: new Date().toISOString(),
      };

      try {
        const { data, error } = await supabase
          .from('daily_standups')
          .upsert(payload, { onConflict: 'user_id,standup_date' })
          .select()
          .single();
        if (error) throw error;

        setStandups((prev) => {
          const filtered = prev.filter(
            (s) => !(s.user_id === user.id && s.standup_date === payload.standup_date)
          );
          return [data, ...filtered];
        });
        return { ok: true };
      } catch (e) {
        console.error('[Standup] saveStandup:', e);
        return { ok: false, error: e.message };
      }
    },
    [user, profile]
  );

  /* 삭제 */
  const deleteStandup = useCallback(
    async (id) => {
      if (!user) return { ok: false };
      try {
        const { error } = await supabase.from('daily_standups').delete().eq('id', id);
        if (error) throw error;
        setStandups((prev) => prev.filter((s) => s.id !== id));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  const openEditor = useCallback(() => setEditorOpen(true), []);
  const closeEditor = useCallback(() => setEditorOpen(false), []);

  return (
    <StandupContext.Provider
      value={{
        standups,
        todayStandups,
        myToday,
        loading,
        editorOpen,
        openEditor,
        closeEditor,
        saveStandup,
        deleteStandup,
        fetchStandups,
      }}
    >
      {children}
    </StandupContext.Provider>
  );
}

export function useStandup() {
  const ctx = useContext(StandupContext);
  if (!ctx) throw new Error('useStandup must be used within StandupProvider');
  return ctx;
}