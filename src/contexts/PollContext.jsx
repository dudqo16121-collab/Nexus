// contexts/PollContext.jsx
// 사내 투표 시스템 컨텍스트.
//
// 데이터:
//  - polls (전체 투표 목록)
//  - activePoll (현재 active 상태인 첫 번째 — 대시보드 위젯용)
//  - myVotes (내가 한 투표들의 option_ids 매핑)
// 액션:
//  - 사용자: castVote / changeVote
//  - 관리자: createPoll / updatePoll / deletePoll / setPollStatus

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const PollContext = createContext(null);

export function PollProvider({ children }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const [polls, setPolls] = useState([]);
  const [votes, setVotes] = useState([]); // 모든 사용자의 모든 vote (결과 집계용)
  const [loading, setLoading] = useState(false);

  /* ── fetch ── */
  const refresh = useCallback(async () => {
    if (!user) {
      setPolls([]);
      setVotes([]);
      return;
    }
    setLoading(true);
    try {
      /* polls */
      const { data: pollsData, error: pollsErr } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });
      if (pollsErr) throw pollsErr;
      setPolls(pollsData || []);

      /* votes — 모든 투표의 모든 응답 (결과 집계용) */
      const { data: votesData, error: votesErr } = await supabase
        .from('poll_votes')
        .select('*');
      if (votesErr) throw votesErr;
      setVotes(votesData || []);
    } catch (e) {
      console.error('[Poll] refresh:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ── 파생 데이터 ── */
  const activePoll = useMemo(() => {
    return polls.find((p) => p.status === 'active') || null;
  }, [polls]);

  /* 내 투표 매핑: pollId → option_ids[] */
  const myVotesMap = useMemo(() => {
    if (!user) return {};
    const map = {};
    votes
      .filter((v) => v.user_id === user.id)
      .forEach((v) => { map[v.poll_id] = v.option_ids || []; });
    return map;
  }, [votes, user]);

  /* 투표별 집계: pollId → { totalVoters, byOption: { optId: count } } */
  const tallyMap = useMemo(() => {
    const map = {};
    polls.forEach((p) => {
      const pollVotes = votes.filter((v) => v.poll_id === p.id);
      const byOption = {};
      (p.options || []).forEach((o) => { byOption[o.id] = 0; });
      pollVotes.forEach((v) => {
        (v.option_ids || []).forEach((oid) => {
          if (byOption[oid] !== undefined) byOption[oid] += 1;
        });
      });
      map[p.id] = {
        totalVoters: pollVotes.length,
        byOption,
      };
    });
    return map;
  }, [polls, votes]);

  /* ── 사용자 액션 ── */
  const castVote = useCallback(async (pollId, optionIds) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다' };
    if (!optionIds?.length) return { ok: false, error: '하나 이상 선택해주세요' };

    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return { ok: false, error: '존재하지 않는 투표' };
    if (poll.status !== 'active') return { ok: false, error: '진행 중인 투표가 아닙니다' };
    if (!poll.multi_select && optionIds.length > 1) {
      return { ok: false, error: '단일 선택 투표입니다' };
    }

    try {
      /* upsert — 이미 투표했으면 변경, 안 했으면 신규 */
      const { error } = await supabase
        .from('poll_votes')
        .upsert(
          {
            poll_id: pollId,
            user_id: user.id,
            option_ids: optionIds,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'poll_id,user_id' }
        );
      if (error) throw error;
      await refresh();
      return { ok: true };
    } catch (e) {
      console.error('[Poll] castVote:', e);
      return { ok: false, error: e.message || '투표 실패' };
    }
  }, [user, polls, refresh]);

  /* ── 관리자 액션 ── */
  const createPoll = useCallback(async (data) => {
    if (!isAdmin) return { ok: false, error: '관리자만 가능합니다' };
    try {
      const { data: row, error } = await supabase
        .from('polls')
        .insert([{
          title: data.title?.trim() || '제목 없음',
          description: data.description?.trim() || null,
          options: data.options || [],
          multi_select: !!data.multi_select,
          status: data.status || 'draft',
          starts_at: data.starts_at || new Date().toISOString(),
          ends_at: data.ends_at || null,
          created_by: user.id,
        }])
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return { ok: true, poll: row };
    } catch (e) {
      console.error('[Poll] createPoll:', e);
      return { ok: false, error: e.message || '생성 실패' };
    }
  }, [isAdmin, user, refresh]);

  const updatePoll = useCallback(async (pollId, data) => {
    if (!isAdmin) return { ok: false, error: '관리자만 가능합니다' };
    try {
      const { error } = await supabase
        .from('polls')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pollId);
      if (error) throw error;
      await refresh();
      return { ok: true };
    } catch (e) {
      console.error('[Poll] updatePoll:', e);
      return { ok: false, error: e.message };
    }
  }, [isAdmin, refresh]);

  const deletePoll = useCallback(async (pollId) => {
    if (!isAdmin) return { ok: false, error: '관리자만 가능합니다' };
    try {
      const { error } = await supabase.from('polls').delete().eq('id', pollId);
      if (error) throw error;
      await refresh();
      return { ok: true };
    } catch (e) {
      console.error('[Poll] deletePoll:', e);
      return { ok: false, error: e.message };
    }
  }, [isAdmin, refresh]);

  const setPollStatus = useCallback(async (pollId, status) => {
    return updatePoll(pollId, { status });
  }, [updatePoll]);

  return (
    <PollContext.Provider value={{
      polls,
      activePoll,
      loading,
      myVotesMap,
      tallyMap,
      refresh,
      /* 사용자 */
      castVote,
      /* 관리자 */
      createPoll, updatePoll, deletePoll, setPollStatus,
    }}>
      {children}
    </PollContext.Provider>
  );
}

export const usePoll = () => {
  const ctx = useContext(PollContext);
  if (!ctx) throw new Error('usePoll must be used within PollProvider');
  return ctx;
};