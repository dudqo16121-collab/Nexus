// contexts/NotificationContext.jsx
// 통합 알림 시스템 — 저장/읽음/실시간 + 알림 생성 헬퍼.
//
// 다른 컨텍스트(메일/태스크/결재/교육/허브)에서 알림을 만들 때는
// useNotification().createNotification(...) 호출.

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

/* 알림 타입별 메타 — 아이콘/색상 표준화 */
export const NOTIF_TYPES = {
  mail:     { icon: 'fa-envelope',     color: '#4361ee', label: '메일' },
  mention:  { icon: 'fa-at',           color: '#06d6a0', label: '멘션' },
  task:     { icon: 'fa-list-check',   color: '#8338ec', label: '태스크' },
  approval: { icon: 'fa-stamp',        color: '#f72585', label: '결재' },
  training: { icon: 'fa-graduation-cap', color: '#f59e0b', label: '교육' },
  kudos:    { icon: 'fa-heart',        color: '#ec4899', label: '칭찬' },
  mission:  { icon: 'fa-bullseye',     color: '#ff9f1c', label: '미션' },
  system:   { icon: 'fa-bell',         color: '#64748b', label: '안내' },
  project:  { icon: 'fa-diagram-project', color: '#8338ec', label: '프로젝트' },
  feedback: { icon: 'fa-comment-dots', color: '#8338ec', label: '피드백' },
};


export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* fetch — 최근 100개 */
  const fetchNotifications = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error('[Notification] fetch:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  /* 실시간 구독 — 새 알림 들어오면 즉시 prepend */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new, ...prev].slice(0, 100));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  /* 안 읽은 개수 */
  const unreadCount = useMemo(
    () => items.filter((n) => !n.read_at).length,
    [items]
  );

  /* 알림 생성 헬퍼 — 다른 컨텍스트에서 호출.
     toUserId 가 본인이면 스킵 (자기 자신에게 알림 안 줌). */
  const createNotification = useCallback(async ({
    toUserId,
    type = 'system',
    title = '',
    body = '',
    link = null,
    refId = null,
  }) => {
    if (!toUserId || (user && toUserId === user.id)) return { ok: false, skip: true };
    const meta = NOTIF_TYPES[type] || NOTIF_TYPES.system;
    try {
      const { error } = await supabase.from('notifications').insert([{
        user_id: toUserId,
        type,
        title,
        body,
        icon: meta.icon,
        color: meta.color,
        link,
        actor_id: user?.id || null,
        ref_id: refId,
      }]);
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.error('[Notification] create:', e);
      return { ok: false, error: e.message };
    }
  }, [user]);

  /* 여러 대상에게 한 번에 (메일 다중 수신자, 멘션 다수 등) */
  const createBulkNotifications = useCallback(async (toUserIds = [], payload) => {
    const ids = toUserIds.filter((id) => id && id !== user?.id);
    if (ids.length === 0) return { ok: true };
    const meta = NOTIF_TYPES[payload.type] || NOTIF_TYPES.system;
    const rows = ids.map((toId) => ({
      user_id: toId,
      type: payload.type || 'system',
      title: payload.title || '',
      body: payload.body || '',
      icon: meta.icon,
      color: meta.color,
      link: payload.link || null,
      actor_id: user?.id || null,
      ref_id: payload.refId || null,
    }));
    try {
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.error('[Notification] bulk:', e);
      return { ok: false, error: e.message };
    }
  }, [user]);

  /* 읽음 처리 */
  const markAsRead = useCallback(async (id) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.read_at) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    try {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    } catch (e) {
      console.warn('[Notification] mark read failed', e);
    }
  }, [items]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: now }));
    try {
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);
    } catch (e) {
      console.warn('[Notification] mark all read failed', e);
    }
  }, [user]);

  const removeOne = useCallback(async (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch (e) {
      console.warn('[Notification] delete failed', e);
    }
  }, []);

  const clearAll = useCallback(async () => {
    if (!user) return;
    if (!window.confirm('모든 알림을 삭제하시겠어요?')) return;
    setItems([]);
    try {
      await supabase.from('notifications').delete().eq('user_id', user.id);
    } catch (e) {
      console.warn('[Notification] clear failed', e);
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      items, unreadCount, loading,
      dropdownOpen, setDropdownOpen,
      fetchNotifications,
      createNotification, createBulkNotifications,
      markAsRead, markAllAsRead,
      removeOne, clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}