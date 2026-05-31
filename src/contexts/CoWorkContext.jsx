// contexts/CoWorkContext.jsx
// 공동 작업 세션 (Co-Work Sessions) — 같이 일하는 공간.

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const CoWorkContext = createContext(null);

export const COWORK_CATEGORIES = [
  { value: 'dev',     label: '개발',    icon: 'fa-code',          color: '#4361ee' },
  { value: 'design',  label: '디자인',  icon: 'fa-palette',       color: '#f72585' },
  { value: 'doc',     label: '문서작업', icon: 'fa-file-lines',    color: '#06d6a0' },
  { value: 'meeting', label: '회의',    icon: 'fa-people-roof',   color: '#8338ec' },
  { value: 'focus',   label: '집중',    icon: 'fa-bullseye',      color: '#ff9f1c' },
  { value: 'etc',     label: '기타',    icon: 'fa-shapes',        color: '#64748b' },
];

export const OUTCOMES = [
  { value: 'done',    label: '완료했어요',    icon: 'fa-check-circle',   color: '#22c55e' },
  { value: 'partial', label: '일부 진행',     icon: 'fa-hourglass-half', color: '#f59e0b' },
  { value: 'blocked', label: '막혔어요',      icon: 'fa-ban',            color: '#ef4444' },
];

export function CoWorkProvider({ children }) {
  const { user, profile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [members, setMembers] = useState([]); // 모든 active 세션의 멤버
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [retroModalSession, setRetroModalSession] = useState(null);

  /* 로드 — 활성 세션 + 오늘 종료된 세션 */
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 1);

      const { data: sData, error: sErr } = await supabase
        .from('cowork_sessions')
        .select('*')
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: false });
      if (sErr) throw sErr;

      const ids = (sData || []).map((s) => s.id);
      let mData = [];
      if (ids.length > 0) {
        const { data, error } = await supabase
          .from('cowork_session_members')
          .select('*')
          .in('session_id', ids);
        if (error) throw error;
        mData = data || [];
      }

      setSessions(sData || []);
      setMembers(mData);
    } catch (e) {
      console.error('[CoWork] fetchSessions:', e);
      setSessions([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchSessions();
  }, [user, fetchSessions]);

  /* 활성 세션 */
  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === 'active'),
    [sessions]
  );

  /* 최근 종료된 세션 (오늘) */
  const recentEnded = useMemo(
    () =>
      sessions
        .filter((s) => s.status === 'ended')
        .sort((a, b) => new Date(b.ended_at) - new Date(a.ended_at))
        .slice(0, 5),
    [sessions]
  );

  /* 세션별 멤버 목록 */
  const sessionMembers = useCallback(
    (sessionId) =>
      members.filter((m) => m.session_id === sessionId && !m.left_at),
    [members]
  );

  /* 내가 참여 중인 세션 */
  const myActiveSession = useMemo(() => {
    if (!user) return null;
    // 내가 호스트인 활성 세션
    const hosted = activeSessions.find((s) => s.host_id === user.id);
    if (hosted) return hosted;
    // 내가 참여 중인 활성 세션
    const memberOf = members.find(
      (m) => m.user_id === user.id && !m.left_at
    );
    if (memberOf) {
      return activeSessions.find((s) => s.id === memberOf.session_id) || null;
    }
    return null;
  }, [activeSessions, members, user]);

  /* 세션 생성 — 자동으로 호스트가 멤버로 등록 */
  const createSession = useCallback(
    async ({ title, goal, category }) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      if (!title.trim()) return { ok: false, error: '제목을 입력해주세요.' };

      try {
        const payload = {
          host_id: user.id,
          host_name: profile?.full_name || '동료',
          host_department: profile?.department || '',
          title: title.trim(),
          goal: (goal || '').trim(),
          category: category || 'etc',
          status: 'active',
        };

        const { data: session, error: sErr } = await supabase
          .from('cowork_sessions')
          .insert([payload])
          .select()
          .single();
        if (sErr) throw sErr;

        // 호스트를 멤버로 등록
        const { data: mem, error: mErr } = await supabase
          .from('cowork_session_members')
          .insert([{
            session_id: session.id,
            user_id: user.id,
            user_name: profile?.full_name || '동료',
          }])
          .select()
          .single();
        if (mErr) throw mErr;

        setSessions((prev) => [session, ...prev]);
        setMembers((prev) => [...prev, mem]);
        return { ok: true, session };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, profile]
  );

  /* 참여 */
  const joinSession = useCallback(
    async (sessionId) => {
      if (!user) return { ok: false };
      try {
        // 기존 참여 (left 표시) 가 있을 수도 있으니 upsert
        const { data, error } = await supabase
          .from('cowork_session_members')
          .upsert(
            {
              session_id: sessionId,
              user_id: user.id,
              user_name: profile?.full_name || '동료',
              joined_at: new Date().toISOString(),
              left_at: null,
            },
            { onConflict: 'session_id,user_id' }
          )
          .select()
          .single();
        if (error) throw error;

        setMembers((prev) => {
          const filtered = prev.filter(
            (m) => !(m.session_id === sessionId && m.user_id === user.id)
          );
          return [...filtered, data];
        });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, profile]
  );

  /* 떠나기 */
  const leaveSession = useCallback(
    async (sessionId) => {
      if (!user) return { ok: false };
      try {
        const { error } = await supabase
          .from('cowork_session_members')
          .update({ left_at: new Date().toISOString() })
          .eq('session_id', sessionId)
          .eq('user_id', user.id);
        if (error) throw error;

        setMembers((prev) =>
          prev.map((m) =>
            m.session_id === sessionId && m.user_id === user.id
              ? { ...m, left_at: new Date().toISOString() }
              : m
          )
        );
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  /* 세션 종료 — 호스트만 */
  const endSession = useCallback(
    async (sessionId, { outcome, retroNote, shareToFeed }) => {
      if (!user) return { ok: false };
      try {
        const { data, error } = await supabase
          .from('cowork_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            outcome: outcome || null,
            retro_note: (retroNote || '').trim() || null,
            shared_to_feed: !!shareToFeed,
          })
          .eq('id', sessionId)
          .eq('host_id', user.id)
          .select()
          .single();
        if (error) throw error;

        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? data : s))
        );

        // 게시판에 한 장 발행
        if (shareToFeed) {
          const session = data;
          const oc = OUTCOMES.find((o) => o.value === outcome);
          const cat = COWORK_CATEGORIES.find((c) => c.value === session.category);
          const memberNames = sessionMembers(sessionId).map((m) => m.user_name).join(', ');
          const minutes = Math.round(
            (new Date(session.ended_at) - new Date(session.started_at)) / 60000
          );
          const content =
            `🤝 공동 작업 세션 회고\n\n` +
            `**제목**: ${session.title}\n` +
            `**카테고리**: ${cat?.label || '기타'}\n` +
            `**목표**: ${session.goal || '-'}\n` +
            `**소요 시간**: ${minutes}분\n` +
            `**참여**: ${memberNames}\n` +
            `**결과**: ${oc?.label || '-'}\n\n` +
            `${retroNote || ''}`;

          try {
            await supabase.from('posts').insert([{
              title: `[공동작업] ${session.title}`,
              content,
              is_notice: false,
              category: '자유게시판',
              author_name: profile?.full_name || '동료',
              user_id: user.id,
              likes: 0,
              view_count: 0,
              comments: [],
              attachments: [],
            }]);
          } catch (e) {
            console.warn('[CoWork] share to feed failed:', e);
          }
        }

        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, profile, sessionMembers]
  );

  /* 삭제 — 호스트만 */
  const deleteSession = useCallback(
    async (sessionId) => {
      if (!user) return { ok: false };
      try {
        const { error } = await supabase
          .from('cowork_sessions')
          .delete()
          .eq('id', sessionId)
          .eq('host_id', user.id);
        if (error) throw error;
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  const openCreateModal = useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
  const openRetroModal = useCallback((session) => setRetroModalSession(session), []);
  const closeRetroModal = useCallback(() => setRetroModalSession(null), []);

  return (
    <CoWorkContext.Provider
      value={{
        sessions,
        activeSessions,
        recentEnded,
        members,
        sessionMembers,
        myActiveSession,
        loading,
        createModalOpen,
        openCreateModal,
        closeCreateModal,
        retroModalSession,
        openRetroModal,
        closeRetroModal,
        createSession,
        joinSession,
        leaveSession,
        endSession,
        deleteSession,
        fetchSessions,
      }}
    >
      {children}
    </CoWorkContext.Provider>
  );
}

export function useCoWork() {
  const ctx = useContext(CoWorkContext);
  if (!ctx) throw new Error('useCoWork must be used within CoWorkProvider');
  return ctx;
}