// contexts/AskContext.jsx
// 요청·도움 게시판 — 누구나 요청, 한 사람만 도움, 해결 시 자동 Kudos.

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useHub } from './HubContext';
import { useNotification } from './NotificationContext';

const AskContext = createContext(null);

export const URGENCY_LEVELS = [
  { value: 'low',    label: '여유', icon: 'fa-leaf',     color: '#64748b' },
  { value: 'normal', label: '보통', icon: 'fa-clock',    color: '#4361ee' },
  { value: 'high',   label: '급함', icon: 'fa-fire',     color: '#ef4444' },
];

export const ASK_STATUSES = [
  { value: 'open',      label: '도움 요청 중', color: '#f59e0b', icon: 'fa-hand' },
  { value: 'claimed',   label: '진행 중',     color: '#4361ee', icon: 'fa-spinner' },
  { value: 'resolved',  label: '해결됨',      color: '#22c55e', icon: 'fa-check-circle' },
  { value: 'cancelled', label: '취소됨',      color: '#94a3b8', icon: 'fa-xmark' },
];

export function AskProvider({ children }) {
  const { user, profile } = useAuth();
  const { sendKudos } = useHub();
  const { createNotification } = useNotification();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resolveModalRequest, setResolveModalRequest] = useState(null);

  /* 로드 */
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 14); // 최근 2주

      const { data, error } = await supabase
        .from('ask_requests')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      console.error('[Ask] fetchRequests:', e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, fetchRequests]);

  /* 상태별 분류 */
  const openRequests = useMemo(
    () => requests.filter((r) => r.status === 'open'),
    [requests]
  );
  const inProgress = useMemo(
    () => requests.filter((r) => r.status === 'claimed'),
    [requests]
  );
  const resolved = useMemo(
    () => requests.filter((r) => r.status === 'resolved'),
    [requests]
  );

  /* 내 요청 / 내가 도와주는 것 */
  const myRequests = useMemo(
    () => requests.filter((r) => r.requester_id === user?.id),
    [requests, user]
  );
  const myHelping = useMemo(
    () => requests.filter((r) => r.helper_id === user?.id),
    [requests, user]
  );

  /* 모든 태그 모음 (중복 제거) */
  const allTags = useMemo(() => {
    const set = new Set();
    requests.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [requests]);

  /* 요청 생성 */
  const createRequest = useCallback(
    async ({ title, description, tags, estimatedMinutes, urgency }) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      if (!title.trim()) return { ok: false, error: '제목을 입력해주세요.' };

      const payload = {
        requester_id: user.id,
        requester_name: profile?.full_name || '동료',
        requester_department: profile?.department || '',
        title: title.trim(),
        description: (description || '').trim(),
        tags: (tags || []).map((t) => t.trim()).filter(Boolean).slice(0, 8),
        estimated_minutes: estimatedMinutes || null,
        urgency: urgency || 'normal',
        status: 'open',
      };

      try {
        const { data, error } = await supabase
          .from('ask_requests')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setRequests((prev) => [data, ...prev]);
        return { ok: true, request: data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, profile]
  );

  /* 도움 잡기 (claim) — 먼저 잡는 사람 */
  const claimRequest = useCallback(
    async (requestId) => {
      if (!user) return { ok: false };
      try {
        // 동시성 안전: status='open' AND helper_id IS NULL 조건으로만 update
        const { data, error } = await supabase
          .from('ask_requests')
          .update({
            status: 'claimed',
            helper_id: user.id,
            helper_name: profile?.full_name || '동료',
            claimed_at: new Date().toISOString(),
          })
          .eq('id', requestId)
          .eq('status', 'open')
          .is('helper_id', null)
          .select()
          .single();

        if (error) throw error;
        if (!data) {
          // 다른 사람이 먼저 잡은 경우
          await fetchRequests();
          return { ok: false, error: '다른 동료가 먼저 잡았어요.' };
        }

        setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));

        // 요청자에게 알림
        createNotification({
          toUserId: data.requester_id,
          type: 'ask',
          title: '도움 손길이 도착했어요 🙌',
          body: `${profile?.full_name || '동료'} 님이 "${data.title}" 요청을 잡았어요.`,
          link: '/groupware',
          refId: data.id,
        });

        return { ok: true, request: data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, profile, createNotification, fetchRequests]
  );

  /* 도움 양보 (unclaim) — 도움자 본인만 */
  const unclaimRequest = useCallback(
    async (requestId) => {
      if (!user) return { ok: false };
      try {
        const { data, error } = await supabase
          .from('ask_requests')
          .update({
            status: 'open',
            helper_id: null,
            helper_name: null,
            claimed_at: null,
          })
          .eq('id', requestId)
          .eq('helper_id', user.id)
          .select()
          .single();
        if (error) throw error;
        setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  /* 해결 완료 — 요청자만, 자동 Kudos 발송 */
  const resolveRequest = useCallback(
    async (requestId, { note, kudosTag, kudosMessage }) => {
      if (!user) return { ok: false };
      const request = requests.find((r) => r.id === requestId);
      if (!request) return { ok: false, error: '요청을 찾을 수 없어요.' };
      if (request.requester_id !== user.id) {
        return { ok: false, error: '요청자만 해결 처리할 수 있어요.' };
      }
      if (!request.helper_id) {
        return { ok: false, error: '아직 도움자가 없어요.' };
      }

      try {
        const { data, error } = await supabase
          .from('ask_requests')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolve_note: (note || '').trim() || null,
          })
          .eq('id', requestId)
          .eq('requester_id', user.id)
          .select()
          .single();
        if (error) throw error;
        setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));

        // 자동 Kudos 발송 (도움자에게)
        try {
          await sendKudos({
            toId: request.helper_id,
            tag: kudosTag || 'thanks',
            message:
              (kudosMessage && kudosMessage.trim()) ||
              `"${request.title}" 요청을 도와줘서 고마워요!`,
          });
        } catch (e) {
          console.warn('[Ask] auto-kudos failed:', e);
        }

        // 도움자에게 알림
        createNotification({
          toUserId: request.helper_id,
          type: 'ask',
          title: '요청이 해결됐어요 ✅',
          body: `"${request.title}" — Kudos와 +10P가 적립됐어요!`,
          link: '/groupware',
          refId: request.id,
        });

        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, requests, sendKudos, createNotification]
  );

  /* 취소 — 요청자만 */
  const cancelRequest = useCallback(
    async (requestId) => {
      if (!user) return { ok: false };
      try {
        const { data, error } = await supabase
          .from('ask_requests')
          .update({ status: 'cancelled' })
          .eq('id', requestId)
          .eq('requester_id', user.id)
          .select()
          .single();
        if (error) throw error;
        setRequests((prev) => prev.map((r) => (r.id === requestId ? data : r)));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  /* 삭제 — 요청자만 */
  const deleteRequest = useCallback(
    async (requestId) => {
      if (!user) return { ok: false };
      try {
        const { error } = await supabase
          .from('ask_requests')
          .delete()
          .eq('id', requestId)
          .eq('requester_id', user.id);
        if (error) throw error;
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  const openCreateModal = useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
  const openResolveModal = useCallback((req) => setResolveModalRequest(req), []);
  const closeResolveModal = useCallback(() => setResolveModalRequest(null), []);

  return (
    <AskContext.Provider
      value={{
        requests,
        openRequests,
        inProgress,
        resolved,
        myRequests,
        myHelping,
        allTags,
        loading,
        createModalOpen,
        openCreateModal,
        closeCreateModal,
        resolveModalRequest,
        openResolveModal,
        closeResolveModal,
        createRequest,
        claimRequest,
        unclaimRequest,
        resolveRequest,
        cancelRequest,
        deleteRequest,
        fetchRequests,
      }}
    >
      {children}
    </AskContext.Provider>
  );
}

export function useAsk() {
  const ctx = useContext(AskContext);
  if (!ctx) throw new Error('useAsk must be used within AskProvider');
  return ctx;
}