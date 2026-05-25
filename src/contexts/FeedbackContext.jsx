// contexts/FeedbackContext.jsx
// FeedbackBox — 익명 피드백 박스 메인 컨텍스트.
//
// 설계 메모:
//  - WellbeingContext 패턴을 차용 (fetch → memo 통계 → action).
//  - 작성/수정/삭제는 모두 RPC 또는 토큰 기반.
//  - 작성자 user_id 는 어디에도 저장하지 않음. 본인 식별은 localStorage 토큰으로만.
//  - Realtime 은 안 씀 (디버깅 비용 ↑). 액션 후 refresh().

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  deptToBucket, tenureToBucket, currentISOWeek,
} from '../lib/feedbackBucket';
import {
  saveToken, removeToken, getToken, getMyFeedbackIds, hashUserForReaction,
  findFeedbacksWithNewResponses, markResponsesSeen, getAllTokens,
  setCurrentUser,
} from '../lib/feedbackToken';
import {
  MIN_TITLE_LENGTH, MAX_TITLE_LENGTH,
  MIN_BODY_LENGTH, MAX_BODY_LENGTH,
  ANONYMITY_THRESHOLD,
  SLA_WARNING_DAYS, SLA_DANGER_DAYS,
} from '../config/feedbackTypes';
import { useNotification } from './NotificationContext';
import { useToast } from './ToastContext';
const FeedbackContext = createContext(null);

const PAGE_SIZE = 30;

export function FeedbackProvider({ children }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;
  const { createBulkNotifications } = useNotification();
  const toast = useToast();

  /* ─── 상태 ───────────────────────────────────────────────────── */
  const [feedbacks, setFeedbacks] = useState([]);          // 전체 목록 (RLS 의해 모두 조회 가능)
  const [responses, setResponses] = useState({});          // { feedback_id: [response, ...] }
  const [myReactions, setMyReactions] = useState(new Set()); // 내가 리액션한 feedback_id 집합
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* 필터 */
  const [filter, setFilter] = useState({
    category: 'all',
    status: 'all',
    sort: 'latest',
    search: '',
    onlyMine: false,
  });
/* 🔐 user 가 바뀌면 토큰 슬롯도 그 user 의 것으로 전환.
     로그아웃 시 anon 슬롯으로 → 익명성 격리 */
  useEffect(() => {
    setCurrentUser(user?.id || null);
  }, [user?.id]);
  /* ─── fetch ──────────────────────────────────────────────────── */
  const fetchFeedbacks = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (err) throw err;
      setFeedbacks(data || []);
    } catch (e) {
      console.error('[Feedback] fetchFeedbacks:', e);
      setError(e.message);
      setFeedbacks([]);
    }
  }, []);

  const fetchResponses = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('feedback_responses')
        .select('*')
        .order('created_at', { ascending: true });
      if (err) throw err;
      const grouped = {};
      (data || []).forEach((r) => {
        if (!grouped[r.feedback_id]) grouped[r.feedback_id] = [];
        grouped[r.feedback_id].push(r);
      });
      setResponses(grouped);
    } catch (e) {
      console.error('[Feedback] fetchResponses:', e);
      setResponses({});
    }
  }, []);

  /* 관리자 user_id 목록 — 새 피드백 작성 시 알림 보낼 대상.
     자주 바뀌지 않으므로 한 번 fetch 후 ref 처럼 활용해도 OK.
     여기서는 단순함을 위해 매번 새로 fetch (관리자 수는 보통 적음). */
  const fetchAdminIds = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_admin', true);
      if (err) throw err;
      return (data || []).map((d) => d.id);
    } catch (e) {
      console.warn('[Feedback] fetchAdminIds:', e);
      return [];
    }
  }, []);

  /* 내가 리액션한 글 ID들 — user_hash 기반.
     모든 reaction 을 가져와서 내 hash 와 일치하는 것만 추출. */
  const fetchMyReactions = useCallback(async () => {
    if (!user) { setMyReactions(new Set()); return; }
    try {
      // 모든 reaction 의 (feedback_id, user_hash) 가져옴
      const { data, error: err } = await supabase
        .from('feedback_reactions')
        .select('feedback_id, user_hash');
      if (err) throw err;

      // 클라이언트에서 내 hash 와 일치하는 것만 추출
      const mine = new Set();
      for (const row of data || []) {
        const myHash = await hashUserForReaction(user.id, row.feedback_id);
        if (myHash === row.user_hash) {
          mine.add(row.feedback_id);
        }
      }
      setMyReactions(mine);
    } catch (e) {
      console.error('[Feedback] fetchMyReactions:', e);
      setMyReactions(new Set());
    }
  }, [user]);

  /* 🔔 내 글에 새 응답이 도착했는지 확인하고 토스트로 알림.
     컨텍스트 로드 + 페이지 방문 시 호출. */
  const checkNewResponses = useCallback(() => {
    const news = findFeedbacksWithNewResponses(feedbacks);
    if (news.length === 0) return;

    // 최대 3개까지만 표시 (스팸 방지)
    news.slice(0, 3).forEach((n, i) => {
      setTimeout(() => {
        toast.info(
          `💬 내 피드백 "${n.feedback.title.slice(0, 30)}${n.feedback.title.length > 30 ? '...' : ''}"에 새 응답 ${n.newCount}개`,
          { duration: 5000 }
        );
      }, i * 800);
      // 확인했으니 seen 카운트 업데이트
      markResponsesSeen(n.feedbackId, n.currentCount);
    });

    if (news.length > 3) {
      toast.info(`그 외 ${news.length - 3}개의 글에도 새 응답이 있어요.`);
    }
  }, [feedbacks, toast]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchFeedbacks(), fetchResponses(), fetchMyReactions()]);
    setLoading(false);
  }, [fetchFeedbacks, fetchResponses, fetchMyReactions]);

  useEffect(() => { refresh(); }, [refresh]);

  /* 피드백/응답 데이터가 갱신될 때마다 새 응답 체크.
     첫 로드 직후에도 확인되고, 페이지 다시 들어왔을 때도 동작. */
  useEffect(() => {
    if (loading) return;
    if (feedbacks.length === 0) return;
    checkNewResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, responses]);  // responses 가 변할 때마다 (응답 fetch 후)

  /* ─── 파생 데이터 ────────────────────────────────────────────── */

  /* 필터링/정렬된 목록 */
  const filteredFeedbacks = useMemo(() => {
    let list = [...feedbacks];

    if (filter.category !== 'all') {
      list = list.filter((f) => f.category === filter.category);
    }
    if (filter.status !== 'all') {
      list = list.filter((f) => f.status === filter.status);
    }
    if (filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      list = list.filter(
        (f) =>
          (f.title || '').toLowerCase().includes(q) ||
          (f.body || '').toLowerCase().includes(q)
      );
    }
    if (filter.onlyMine) {
      const myIds = new Set(getMyFeedbackIds());
      list = list.filter((f) => myIds.has(f.id));
    }

    switch (filter.sort) {
      case 'popular':
        list.sort((a, b) => (b.reaction_count || 0) - (a.reaction_count || 0));
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'unanswered':
        list.sort((a, b) => {
          if ((a.response_count || 0) === 0 && (b.response_count || 0) > 0) return -1;
          if ((a.response_count || 0) > 0 && (b.response_count || 0) === 0) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        break;
      case 'latest':
      default:
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [feedbacks, filter]);

  /* 카테고리별 카운트 — 필터 UI 의 뱃지용 */
  const categoryCounts = useMemo(() => {
    const map = { all: feedbacks.length };
    feedbacks.forEach((f) => {
      map[f.category] = (map[f.category] || 0) + 1;
    });
    return map;
  }, [feedbacks]);

  /* 상태별 카운트 */
  const statusCounts = useMemo(() => {
    const map = { all: feedbacks.length };
    feedbacks.forEach((f) => {
      map[f.status] = (map[f.status] || 0) + 1;
    });
    return map;
  }, [feedbacks]);
/* ── Phase 3 — 관리자 인사이트 집계 ───────────────────────── */

  /* 카테고리별 집계 (도넛용) */
  const categoryStats = useMemo(() => {
    const map = {};
    feedbacks.forEach((f) => {
      map[f.category] = (map[f.category] || 0) + 1;
    });
    return Object.entries(map)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [feedbacks]);

  /* 감정별 집계 */
  const sentimentStats = useMemo(() => {
    const map = { positive: 0, suggestion: 0, neutral: 0, negative: 0 };
    feedbacks.forEach((f) => {
      if (map[f.sentiment] !== undefined) map[f.sentiment]++;
    });
    return map;
  }, [feedbacks]);

  /* 12주 감정 트렌드 (created_week 기준) */
  const sentimentTrend = useMemo(() => {
    // 최근 12주의 ISO week 문자열 배열 생성
    const weeks = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 86400_000);
      const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = target.getUTCDay() || 7;
      target.setUTCDate(target.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
      const w = `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      weeks.push(w);
    }

    return weeks.map((w) => {
      const ws = feedbacks.filter((f) => f.created_week === w);
      return {
        week: w,
        weekLabel: w.split('-W')[1], // 'W20' 같은 짧은 라벨
        positive: ws.filter((f) => f.sentiment === 'positive').length,
        suggestion: ws.filter((f) => f.sentiment === 'suggestion').length,
        neutral: ws.filter((f) => f.sentiment === 'neutral').length,
        negative: ws.filter((f) => f.sentiment === 'negative').length,
        total: ws.length,
      };
    });
  }, [feedbacks]);

  /* 부서별 신호 (N>=ANONYMITY_THRESHOLD 만 표시) */
  const deptSignal = useMemo(() => {
    const map = {};
    feedbacks.forEach((f) => {
      if (!f.dept_bucket) return;
      if (!map[f.dept_bucket]) {
        map[f.dept_bucket] = { dept: f.dept_bucket, total: 0, positive: 0, suggestion: 0, negative: 0, neutral: 0 };
      }
      map[f.dept_bucket].total++;
      map[f.dept_bucket][f.sentiment] = (map[f.dept_bucket][f.sentiment] || 0) + 1;
    });
    return Object.values(map)
      .filter((d) => d.total >= ANONYMITY_THRESHOLD) // 익명성 가드
      .map((d) => {
        const positivity = d.total > 0
          ? ((d.positive + d.suggestion * 0.5) - d.negative) / d.total
          : 0;
        return {
          ...d,
          positivity, // -1 ~ +1
          mood: positivity > 0.2 ? '긍정적' : positivity < -0.2 ? '주의' : '중립',
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [feedbacks]);

  /* 키워드 빈도 (제목+본문에서 추출, 한글 명사 위주 단순 토크나이저) */
  const keywordCloud = useMemo(() => {
    // 한글 불용어 (자주 등장하지만 의미 없는 어휘)
    const STOP = new Set([
      '있다', '없다', '하다', '되다', '같다', '이다', '아니다',
      '그리고', '하지만', '그래서', '그런데', '때문에', '대해', '대한',
      '있는', '없는', '하는', '되는', '같은', '많이', '조금', '정말',
      '너무', '아주', '매우', '항상', '자주', '가끔', '계속',
      '우리', '저희', '여러분', '모두', '모든', '전체', '하나',
      '있어요', '없어요', '해요', '돼요', '이에요', '예요',
      '있습니다', '없습니다', '합니다', '됩니다', '입니다',
      '것이', '것을', '것은', '것도', '것이라', '것으로',
      '회사', '직원', '팀', '부서', '업무', '일이', '내용',
      '오늘', '어제', '내일', '지금', '이번', '저번', '다음',
    ]);

    const freq = {};
    feedbacks.forEach((f) => {
      const text = `${f.title || ''} ${f.body || ''}`;
      // 한글 2~6글자 시퀀스만 추출
      const tokens = text.match(/[가-힣]{2,6}/g) || [];
      tokens.forEach((t) => {
        if (STOP.has(t)) return;
        freq[t] = (freq[t] || 0) + 1;
      });
    });

    return Object.entries(freq)
      .filter(([, c]) => c >= 2) // 2회 이상 등장한 것만
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40); // 상위 40개
  }, [feedbacks]);

  /* 평균 응답 시간 (응답된 글들 기준, 일 단위) */
  const avgResponseDays = useMemo(() => {
    let totalMs = 0;
    let count = 0;
    feedbacks.forEach((f) => {
      const fbResponses = responses[f.id];
      if (!fbResponses || fbResponses.length === 0) return;
      const firstResp = fbResponses[0];
      const ms = new Date(firstResp.created_at).getTime() - new Date(f.created_at).getTime();
      if (ms > 0) {
        totalMs += ms;
        count++;
      }
    });
    return count > 0 ? totalMs / count / 86400_000 : null;
  }, [feedbacks, responses]);

  /* 응답률 (응답 1개 이상 받은 글 / 전체 글) */
  const responseRate = useMemo(() => {
    if (feedbacks.length === 0) return 0;
    const responded = feedbacks.filter((f) => (f.response_count || 0) > 0).length;
    return responded / feedbacks.length;
  }, [feedbacks]);

  /* 응답 SLA 알림 (관리자) */
  const slaAlerts = useMemo(() => {
    if (!isAdmin) return { warning: 0, danger: 0, list: [] };
    const now = Date.now();
    const warningMs = SLA_WARNING_DAYS * 86400_000;
    const dangerMs = SLA_DANGER_DAYS * 86400_000;
    const list = [];
    let warning = 0, danger = 0;

    feedbacks.forEach((f) => {
      if (f.response_count > 0) return;
      if (f.status === 'archived' || f.status === 'resolved') return;
      const age = now - new Date(f.created_at).getTime();
      if (age >= dangerMs) {
        danger++;
        list.push({ ...f, ageDays: Math.floor(age / 86400_000), severity: 'danger' });
      } else if (age >= warningMs) {
        warning++;
        list.push({ ...f, ageDays: Math.floor(age / 86400_000), severity: 'warning' });
      }
    });

    list.sort((a, b) => b.ageDays - a.ageDays);
    return { warning, danger, list };
  }, [feedbacks, isAdmin]);

  /* ─── 액션: 작성 ────────────────────────────────────────────── */
const createFeedback = useCallback(
    async (payload) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };

      // 검증
      const title = (payload.title || '').trim();
      const body = (payload.body || '').trim();
      if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH) {
        return { ok: false, error: `제목은 ${MIN_TITLE_LENGTH}-${MAX_TITLE_LENGTH}자여야 합니다.` };
      }
      if (body.length < MIN_BODY_LENGTH || body.length > MAX_BODY_LENGTH) {
        return { ok: false, error: `본문은 ${MIN_BODY_LENGTH}-${MAX_BODY_LENGTH}자여야 합니다.` };
      }

      // 버킷 계산 (선택적 — 작성자가 메타 미공개 선택했으면 null)
      const includeDept = payload.includeDept !== false;
      const includeTenure = payload.includeTenure !== false;

      try {
        // RPC 한 번으로 피드백 + 토큰을 원자적으로 생성
        const { data, error: err } = await supabase.rpc('fb_create_with_token', {
          p_category: payload.category || 'etc',
          p_target_scope: payload.target_scope || 'company',
          p_target_label: payload.target_label || null,
          p_sentiment: payload.sentiment || 'neutral',
          p_title: title,
          p_body: body,
          p_dept_bucket: includeDept ? deptToBucket(profile?.department) : null,
          p_tenure_bucket: includeTenure ? tenureToBucket(profile?.hire_date) : null,
          p_created_week: currentISOWeek(),
        });
        if (err) throw err;

        // RPC 결과 — table 반환이므로 배열의 첫 row
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || !row.feedback_id || !row.token) {
          throw new Error('서버 응답이 비어있습니다.');
        }

        // localStorage 에 토큰 저장
        // localStorage 에 토큰 저장
        saveToken(row.feedback_id, row.token, title);

        // 내 글이므로 초기 응답 카운트를 0으로 마크
        markResponsesSeen(row.feedback_id, 0);

        // 🔔 관리자에게 알림 발송 (작성자는 누군지 모르게)
        try {
          const adminIds = await fetchAdminIds();
          if (adminIds.length > 0) {
            await createBulkNotifications(adminIds, {
              type: 'feedback',
              title: '새 익명 피드백이 도착했어요',
              body: title.length > 50 ? title.slice(0, 50) + '...' : title,
              link: '/feedback',
              refId: row.feedback_id,
            });
          }
        } catch (notifErr) {
          console.warn('[Feedback] admin notification failed:', notifErr);
        }

        // 목록 새로고침
        await fetchFeedbacks();

        return { ok: true, feedbackId: row.feedback_id, token: row.token };
      } catch (e) {
        console.error('[Feedback] createFeedback:', e);
        return { ok: false, error: e.message || '작성 실패' };
      }
    },
    [user, profile, fetchFeedbacks]
  );

  /* ─── 액션: 본인 수정 (토큰 검증) ────────────────────────────── */
  const updateFeedback = useCallback(
    async (feedbackId, payload) => {
      const token = getToken(feedbackId);
      if (!token) return { ok: false, error: '본인 작성 글만 수정할 수 있습니다.' };

      const title = (payload.title || '').trim();
      const body = (payload.body || '').trim();
      if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH) {
        return { ok: false, error: `제목은 ${MIN_TITLE_LENGTH}-${MAX_TITLE_LENGTH}자여야 합니다.` };
      }
      if (body.length < MIN_BODY_LENGTH || body.length > MAX_BODY_LENGTH) {
        return { ok: false, error: `본문은 ${MIN_BODY_LENGTH}-${MAX_BODY_LENGTH}자여야 합니다.` };
      }

      try {
        const { error: err } = await supabase.rpc('fb_update_with_token', {
          p_token: token,
          p_feedback_id: feedbackId,
          p_title: title,
          p_body: body,
          p_category: payload.category,
          p_sentiment: payload.sentiment,
          p_target_scope: payload.target_scope,
          p_target_label: payload.target_label || null,
        });
        if (err) throw err;
        await fetchFeedbacks();
        return { ok: true };
      } catch (e) {
        console.error('[Feedback] updateFeedback:', e);
        return { ok: false, error: e.message || '수정 실패' };
      }
    },
    [fetchFeedbacks]
  );

  /* ─── 액션: 본인 삭제 (토큰 검증) ────────────────────────────── */
  const deleteFeedback = useCallback(
    async (feedbackId) => {
      const token = getToken(feedbackId);
      if (!token) return { ok: false, error: '본인 작성 글만 삭제할 수 있습니다.' };

      try {
        const { error: err } = await supabase.rpc('fb_delete_with_token', {
          p_token: token,
          p_feedback_id: feedbackId,
        });
        if (err) throw err;
        removeToken(feedbackId);
        await fetchFeedbacks();
        return { ok: true };
      } catch (e) {
        console.error('[Feedback] deleteFeedback:', e);
        return { ok: false, error: e.message || '삭제 실패' };
      }
    },
    [fetchFeedbacks]
  );

  /* ─── 액션: 리액션 토글 ──────────────────────────────────────── */
  const toggleReaction = useCallback(
    async (feedbackId) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const userHash = await hashUserForReaction(user.id, feedbackId);
        const already = myReactions.has(feedbackId);

        if (already) {
          // 삭제
          const { error: err } = await supabase
            .from('feedback_reactions')
            .delete()
            .eq('feedback_id', feedbackId)
            .eq('user_hash', userHash);
          if (err) throw err;
          setMyReactions((prev) => {
            const next = new Set(prev);
            next.delete(feedbackId);
            return next;
          });
        } else {
          // 추가
          const { error: err } = await supabase
            .from('feedback_reactions')
            .insert([{ feedback_id: feedbackId, user_hash: userHash }]);
          if (err) throw err;
          setMyReactions((prev) => {
            const next = new Set(prev);
            next.add(feedbackId);
            return next;
          });
        }

        // 카운트는 트리거가 알아서 올림 — 화면 동기화 위해 해당 글만 refetch
        const { data } = await supabase
          .from('feedbacks')
          .select('reaction_count')
          .eq('id', feedbackId)
          .single();
        if (data) {
          setFeedbacks((prev) =>
            prev.map((f) => (f.id === feedbackId ? { ...f, reaction_count: data.reaction_count } : f))
          );
        }
        return { ok: true };
      } catch (e) {
        console.error('[Feedback] toggleReaction:', e);
        return { ok: false, error: e.message || '리액션 실패' };
      }
    },
    [user, myReactions]
  );

  /* ─── 액션: 관리자 응답 ──────────────────────────────────────── */
  const respondToFeedback = useCallback(
    async (feedbackId, body, role) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      if (!isAdmin) return { ok: false, error: '관리자만 응답할 수 있습니다.' };

      const trimmed = (body || '').trim();
      if (trimmed.length < 5) return { ok: false, error: '응답은 5자 이상이어야 합니다.' };

      try {
        const { error: err } = await supabase.from('feedback_responses').insert([
          {
            feedback_id: feedbackId,
            responder_id: user.id,
            responder_name: profile?.full_name || '관리자',
            responder_role: role || profile?.department || '관리자',
            body: trimmed,
          },
        ]);
        if (err) throw err;

        await Promise.all([fetchResponses(), fetchFeedbacks()]);
        return { ok: true };
      } catch (e) {
        console.error('[Feedback] respondToFeedback:', e);
        return { ok: false, error: e.message || '응답 실패' };
      }
    },
    [user, profile, isAdmin, fetchResponses, fetchFeedbacks]
  );

  /* ─── 액션: 관리자 상태 변경 ─────────────────────────────────── */
  const updateStatus = useCallback(
    async (feedbackId, newStatus) => {
      if (!isAdmin) return { ok: false, error: '관리자만 상태를 변경할 수 있습니다.' };
      try {
        // status 변경은 RLS 의해 차단되어 있으므로, 별도 RPC 가 필요.
        // 일단 Phase 1 에서는 RLS 정책을 따로 두는 것보다 RPC 로 일관 처리하는 것이 깔끔.
        // (실제 사용 시 fb_update_status 같은 RPC 추가 권장. 여기서는 trigger 로 충분.)
        const { error: err } = await supabase
          .from('feedbacks')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', feedbackId);
        if (err) throw err;
        await fetchFeedbacks();
        return { ok: true };
      } catch (e) {
        console.error('[Feedback] updateStatus:', e);
        return { ok: false, error: e.message || '상태 변경 실패' };
      }
    },
    [isAdmin, fetchFeedbacks]
  );

  /* ─── value ──────────────────────────────────────────────────── */
  const value = {
    // 데이터
    feedbacks,
    filteredFeedbacks,
    responses,
    myReactions,
    loading,
    error,
    // 권한
    isAdmin,
    // 필터
    filter,
    setFilter,
    categoryCounts,
    statusCounts,
    // 알림
    slaAlerts,
    // 액션
    refresh,
    checkNewResponses,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    toggleReaction,
    respondToFeedback,
    updateStatus,
    // 유틸
    isMyFeedback: (fid) => Boolean(getToken(fid)),
    ANONYMITY_THRESHOLD,
    // 인사이트 (Phase 3)
    categoryStats,
    sentimentStats,
    sentimentTrend,
    deptSignal,
    keywordCloud,
    avgResponseDays,
    responseRate,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within <FeedbackProvider>');
  return ctx;
}
