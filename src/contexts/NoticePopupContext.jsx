// contexts/NoticePopupContext.jsx
// 사내 공지 팝업 관리 + 표시 로직.
//
//  - 활성 공지를 로드 (현재 시각이 start_at ~ end_at 범위)
//  - 사용자가 확인 안 한 공지를 큐로 관리 (한 번에 1개씩 표시)
//  - "확인" → localStorage에 영구 저장 (show_once=true 인 경우)
//  - "오늘 안 보기" → 오늘 날짜와 함께 저장

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NoticePopupContext = createContext(null);

const DISMISSED_KEY = 'nexus_notice_dismissed';
const SNOOZED_KEY = 'nexus_notice_snoozed';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDismissed(userId) {
  try {
    const raw = localStorage.getItem(`${DISMISSED_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveDismissed(userId, ids) {
  localStorage.setItem(`${DISMISSED_KEY}_${userId}`, JSON.stringify(ids));
}
function getSnoozed(userId) {
  try {
    const raw = localStorage.getItem(`${SNOOZED_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveSnoozed(userId, obj) {
  localStorage.setItem(`${SNOOZED_KEY}_${userId}`, JSON.stringify(obj));
}

export function NoticePopupProvider({ children }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const [allNotices, setAllNotices] = useState([]); // 관리용 — 전체 목록
  const [loading, setLoading] = useState(false);

  /* ───── 활성 공지 + 표시 큐 ───── */

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notice_popups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[NoticePopup] fetch:', error);
      setAllNotices([]);
    } else {
      setAllNotices(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  /* 현재 표시되어야 할 공지 (활성 + 기간 OK + 안 본 것) */
  const activeQueue = useMemo(() => {
    if (!user || !allNotices.length) return [];
    const now = Date.now();
    const today = todayStr();
    const dismissed = new Set(getDismissed(user.id));
    const snoozed = getSnoozed(user.id);

    return allNotices.filter((n) => {
      /* 활성 / 기간 검증 */
      if (!n.is_active) return false;
      if (n.start_at && new Date(n.start_at).getTime() > now) return false;
      if (n.end_at && new Date(n.end_at).getTime() < now) return false;

      /* 권한 매칭 */
      if (n.target_roles === 'admin' && !isAdmin) return false;
      if (n.target_roles === 'user' && isAdmin) return false;

      /* 이미 본 거 */
      if (n.show_once && dismissed.has(n.id)) return false;
      if (snoozed[n.id] === today) return false;

      return true;
    }).sort((a, b) => {
      /* urgent > warning > info 순 */
      const order = { urgent: 0, warning: 1, info: 2 };
      const oa = order[a.priority] ?? 9;
      const ob = order[b.priority] ?? 9;
      if (oa !== ob) return oa - ob;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [allNotices, user, isAdmin]);

  /* 현재 표시 중인 공지 */
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentNotice = activeQueue[currentIndex] || null;

  useEffect(() => {
    /* 큐가 변할 때 currentIndex 리셋 */
    setCurrentIndex(0);
  }, [activeQueue.length]);

  /* "확인" 처리 */
  const dismissCurrent = useCallback(() => {
    if (!user || !currentNotice) return;
    if (currentNotice.show_once) {
      const ids = getDismissed(user.id);
      if (!ids.includes(currentNotice.id)) {
        ids.push(currentNotice.id);
        saveDismissed(user.id, ids);
      }
    }
    /* 다음 공지로 */
    setCurrentIndex((i) => i + 1);
  }, [user, currentNotice]);

  /* "오늘 하루 안 보기" */
  const snoozeToday = useCallback(() => {
    if (!user || !currentNotice) return;
    const snoozed = getSnoozed(user.id);
    snoozed[currentNotice.id] = todayStr();
    saveSnoozed(user.id, snoozed);
    setCurrentIndex((i) => i + 1);
  }, [user, currentNotice]);

  /* ───── 관리자 CRUD ───── */

  const createNotice = useCallback(async (payload) => {
    if (!user) return { ok: false };
    try {
      const { data, error } = await supabase
        .from('notice_popups')
        .insert([{
          ...payload,
          created_by: user.id,
          created_by_name: profile?.full_name || user.email?.split('@')[0],
        }])
        .select()
        .single();
      if (error) throw error;
      setAllNotices((prev) => [data, ...prev]);
      return { ok: true, notice: data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user, profile]);

  const updateNotice = useCallback(async (id, patch) => {
    try {
      const { error } = await supabase
        .from('notice_popups')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setAllNotices((prev) => prev.map((n) => n.id === id ? { ...n, ...patch } : n));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const deleteNotice = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('notice_popups').delete().eq('id', id);
      if (error) throw error;
      setAllNotices((prev) => prev.filter((n) => n.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  return (
    <NoticePopupContext.Provider value={{
      allNotices,
      loading,
      currentNotice,
      dismissCurrent,
      snoozeToday,
      createNotice,
      updateNotice,
      deleteNotice,
      fetchNotices,
    }}>
      {children}
    </NoticePopupContext.Provider>
  );
}

export function useNoticePopup() {
  const ctx = useContext(NoticePopupContext);
  if (!ctx) throw new Error('useNoticePopup must be used within NoticePopupProvider');
  return ctx;
}