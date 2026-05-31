// contexts/HubContext.jsx
// INJOY Hub 데이터 로직 — 성능 최적화 버전.
// 변경점:
//  - mountedRef 패턴으로 unmount 후 setState 방지
//  - 자동 뱃지 획득 ref 가드로 무한 평가 방지
//  - useMemo 의존성 좁히기 (외부 컨텍스트의 필드만 추출)
//  - 사용자별 누적 포인트 — Map으로 1패스 계산

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

import { useAsk } from './AskContext';
import { useProject } from './ProjectContext';
import { useApproval } from './ApprovalContext';
import { useCoWork } from './CoWorkContext';
import { useStandup } from './StandupContext';
import { useIdea } from './IdeaContext';

const HubContext = createContext(null);

/* ─── 상수 ─────────────────────────────────────── */
export const KUDOS_TAGS = [
  { id: 'thanks',     label: '고마워요',  icon: 'fa-heart',         color: '#f72585' },
  { id: 'great-work', label: '잘했어요',  icon: 'fa-star',          color: '#ff9f1c' },
  { id: 'teamwork',   label: '팀워크',    icon: 'fa-people-group',  color: '#4361ee' },
  { id: 'innovation', label: '아이디어',  icon: 'fa-lightbulb',     color: '#06d6a0' },
];

export const KUDOS_REACTIONS = [
  { id: 'heart',    emoji: '❤️',  label: '좋아요' },
  { id: 'clap',     emoji: '🙌',  label: '대단해요' },
  { id: 'applause', emoji: '👏',  label: '박수' },
  { id: 'fire',     emoji: '🔥',  label: '최고예요' },
];

export const PRODUCT_CATEGORIES = [
  { value: 'all',     label: '전체',     icon: 'fa-store',          color: '#6b7280' },
  { value: 'leave',   label: '연차/휴식', icon: 'fa-umbrella-beach', color: '#06d6a0' },
  { value: 'meal',    label: '식사',      icon: 'fa-utensils',       color: '#f59e0b' },
  { value: 'voucher', label: '상품권',    icon: 'fa-ticket',         color: '#ec4899' },
  { value: 'goods',   label: '굿즈',      icon: 'fa-gift',           color: '#8338ec' },
  { value: 'etc',     label: '기타',      icon: 'fa-box',            color: '#6b7280' },
];

export const MOOD_OPTIONS = [
  { value: 'great',   emoji: '😄', label: '아주 좋아요', color: '#22c55e' },
  { value: 'good',    emoji: '🙂', label: '좋아요',     color: '#06d6a0' },
  { value: 'neutral', emoji: '😐', label: '그냥 그래요', color: '#94a3b8' },
  { value: 'tired',   emoji: '😩', label: '피곤해요',   color: '#f59e0b' },
  { value: 'bad',     emoji: '😔', label: '힘들어요',   color: '#ef4444' },
];

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export const BADGE_RARITY = {
  common:    { label: '일반',   color: '#94a3b8', glow: 'rgba(148, 163, 184, 0.4)' },
  rare:      { label: '레어',   color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' },
  epic:      { label: '에픽',   color: '#a855f7', glow: 'rgba(168, 85, 247, 0.55)' },
  legendary: { label: '레전드', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)' },
};

const LEVEL_THRESHOLD = 100;

/* ─── 헬퍼 ─────────────────────────────────────── */
const ymd = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const todayStr = () => ymd(new Date());
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymd(d);
};

const getWeekMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const emptyStats = () => ({
  total: 0, earned: 0, spent: 0,
  kudos: 0, missions: 0, checkins: 0, autoMissions: 0, reviews: 0, badges: 0,
  level: 1, progressInLevel: 0, nextLevelAt: LEVEL_THRESHOLD,
});

export function HubProvider({ children }) {
  const { user } = useAuth();
  const { createNotification } = useNotification();

  /* unmount 가드 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* 다른 컨텍스트 — 안전하게 */
  let askContext = null, projectContext = null, approvalContext = null;
  let coworkContext = null, standupContext = null, ideaContext = null;
  try { askContext = useAsk(); } catch { askContext = null; }
  try { projectContext = useProject(); } catch { projectContext = null; }
  try { approvalContext = useApproval(); } catch { approvalContext = null; }
  try { coworkContext = useCoWork(); } catch { coworkContext = null; }
  try { standupContext = useStandup(); } catch { standupContext = null; }
  try { ideaContext = useIdea(); } catch { ideaContext = null; }

  /* ─── state ─── */
  const [kudos, setKudos] = useState([]);
  const [missions, setMissions] = useState([]);
  const [progresses, setProgresses] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [autoMissions, setAutoMissions] = useState([]);
  const [autoClaims, setAutoClaims] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [helpfuls, setHelpfuls] = useState([]);
  const [kudosReactions, setKudosReactions] = useState([]);
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [recentBadge, setRecentBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(false);

  /* 모달 */
  const [sendKudosModal, setSendKudosModal] = useState({ open: false, presetTarget: null });
  const [missionEditorModal, setMissionEditorModal] = useState({ open: false, mission: null });
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);

  /* 이번 주 월요일 — 한 번만 계산 */
  const thisWeekMonday = useMemo(() => getWeekMonday(), []);
  const thisWeekMondayStr = useMemo(() => ymd(thisWeekMonday), [thisWeekMonday]);
  const thisWeekMondayTs = useMemo(() => thisWeekMonday.getTime(), [thisWeekMonday]);

  /* ─── 데이터 fetch ─── */

  const safeSet = useCallback((setter, data) => {
    if (mountedRef.current) setter(data);
  }, []);

  const fetchKudos = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_kudos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    safeSet(setKudos, error ? [] : (data || []));
  }, [safeSet]);

  const fetchMissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_missions')
      .select('*')
      .order('created_at', { ascending: false });
    safeSet(setMissions, error ? [] : (data || []));
  }, [safeSet]);

  const fetchProgresses = useCallback(async () => {
    const { data, error } = await supabase.from('hub_mission_progress').select('*');
    safeSet(setProgresses, error ? [] : (data || []));
  }, [safeSet]);

  const fetchProducts = useCallback(async () => {
    if (mountedRef.current) setMarketLoading(true);
    const { data, error } = await supabase
      .from('hub_products')
      .select('*')
      .order('created_at', { ascending: false });
    safeSet(setProducts, error ? [] : (data || []));
    if (mountedRef.current) setMarketLoading(false);
  }, [safeSet]);

  const fetchPurchases = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_purchases')
      .select('*')
      .order('created_at', { ascending: false });
    safeSet(setPurchases, error ? [] : (data || []));
  }, [safeSet]);

  const fetchCheckins = useCallback(async () => {
    if (!user) {
      safeSet(setCheckins, []);
      return;
    }
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data, error } = await supabase
      .from('hub_checkins')
      .select('*')
      .eq('user_id', user.id)
      .gte('checkin_date', ymd(since))
      .order('checkin_date', { ascending: false });
    safeSet(setCheckins, error ? [] : (data || []));
  }, [user, safeSet]);

  const fetchAutoMissions = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_auto_missions')
      .select('*')
      .order('created_at', { ascending: true });
    safeSet(setAutoMissions, error ? [] : (data || []));
  }, [safeSet]);

  const fetchAutoClaims = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_auto_mission_claims')
      .select('*')
      .order('claimed_at', { ascending: false });
    safeSet(setAutoClaims, error ? [] : (data || []));
  }, [safeSet]);

  const fetchReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_product_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    safeSet(setReviews, error ? [] : (data || []));
  }, [safeSet]);

  const fetchHelpfuls = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_review_helpfuls')
      .select('*');
    safeSet(setHelpfuls, error ? [] : (data || []));
  }, [safeSet]);

  const fetchKudosReactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_kudos_reactions')
      .select('*')
      .order('created_at', { ascending: false });
    safeSet(setKudosReactions, error ? [] : (data || []));
  }, [safeSet]);

  const fetchBadges = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_badges')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    safeSet(setBadges, error ? [] : (data || []));
  }, [safeSet]);

  const fetchUserBadges = useCallback(async () => {
    const { data, error } = await supabase
      .from('hub_user_badges')
      .select('*')
      .order('earned_at', { ascending: false });
    safeSet(setUserBadges, error ? [] : (data || []));
  }, [safeSet]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchKudos(), fetchMissions(), fetchProgresses(),
      fetchProducts(), fetchPurchases(), fetchCheckins(),
      fetchAutoMissions(), fetchAutoClaims(),
      fetchReviews(), fetchHelpfuls(),
      fetchKudosReactions(),
      fetchBadges(), fetchUserBadges(),
    ]);
    if (mountedRef.current) setLoading(false);
  }, [
    fetchKudos, fetchMissions, fetchProgresses,
    fetchProducts, fetchPurchases, fetchCheckins,
    fetchAutoMissions, fetchAutoClaims,
    fetchReviews, fetchHelpfuls, fetchKudosReactions,
    fetchBadges, fetchUserBadges,
  ]);

  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ─── 외부 컨텍스트 데이터 추출 — 필드만 ─── */
  /* 외부 컨텍스트 객체 통째로가 deps에 들어가면 매번 새 참조라 재계산됨 → 필드만 뽑아 안정화 */
  const askRequests = askContext?.requests;
  const projectTasks = projectContext?.tasks;
  const approvalApprovals = approvalContext?.approvals;
  const coworkSessions = coworkContext?.sessions;
  const coworkMembers = coworkContext?.members;
  const standupStandups = standupContext?.standups;
  const ideaCards = ideaContext?.cards;

  /* ─── 핵심 통합: 사용자별 포인트를 한 번에 계산 (Map 1패스) ─── */
  const userPoints = useMemo(() => {
    const map = new Map(); // uid -> { ... 누적 포인트 }

    const getEntry = (uid) => {
      if (!map.has(uid)) {
        map.set(uid, {
          fromKudos: 0, fromMissions: 0, fromCheckins: 0,
          fromAuto: 0, fromReviews: 0, fromBadges: 0,
          spent: 0,
        });
      }
      return map.get(uid);
    };

    // 칭찬 받은 포인트
    for (const k of kudos) {
      if (k.to_id) getEntry(k.to_id).fromKudos += (k.points || 0);
    }
    // 미션 완료 포인트
    const missionPointById = {};
    for (const m of missions) missionPointById[m.id] = m.points || 0;
    for (const p of progresses) {
      if (p.status === 'completed' && p.user_id) {
        getEntry(p.user_id).fromMissions += (missionPointById[p.mission_id] || 0);
      }
    }
    // 체크인 포인트
    for (const c of checkins) {
      if (c.user_id) getEntry(c.user_id).fromCheckins += (c.points_earned || 0);
    }
    // 자동 미션 클레임 포인트
    for (const c of autoClaims) {
      if (c.user_id) getEntry(c.user_id).fromAuto += (c.points_earned || 0);
    }
    // 후기 포인트
    for (const r of reviews) {
      if (r.user_id) getEntry(r.user_id).fromReviews += (r.points_earned || 0);
    }
    // 뱃지 보너스 포인트
    const badgePointById = {};
    for (const b of badges) badgePointById[b.id] = b.bonus_points || 0;
    for (const ub of userBadges) {
      if (ub.user_id) getEntry(ub.user_id).fromBadges += (badgePointById[ub.badge_id] || 0);
    }
    // 구매로 차감
    for (const pu of purchases) {
      if (pu.user_id) getEntry(pu.user_id).spent += (pu.price_paid || 0);
    }

    // 최종 통계로 변환
    const result = {};
    for (const [uid, e] of map.entries()) {
      const earned = e.fromKudos + e.fromMissions + e.fromCheckins +
                     e.fromAuto + e.fromReviews + e.fromBadges;
      result[uid] = {
        total: earned - e.spent,
        earned,
        spent: e.spent,
        kudos: e.fromKudos,
        missions: e.fromMissions,
        checkins: e.fromCheckins,
        autoMissions: e.fromAuto,
        reviews: e.fromReviews,
        badges: e.fromBadges,
        level: Math.floor(earned / LEVEL_THRESHOLD) + 1,
        progressInLevel: earned % LEVEL_THRESHOLD,
        nextLevelAt: LEVEL_THRESHOLD,
      };
    }
    return result;
  }, [kudos, missions, progresses, purchases, checkins, autoClaims, reviews, badges, userBadges]);

  const myStats = useMemo(() => {
    if (!user) return emptyStats();
    return userPoints[user.id] || emptyStats();
  }, [userPoints, user]);

  const myPoints = myStats.total;

  /* ─── 이달의 랭킹 ─── */
  const monthlyRanking = useMemo(() => {
    const now = new Date();
    const monthStartTs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const counts = new Map();
    for (const k of kudos) {
      if (new Date(k.created_at).getTime() >= monthStartTs) {
        counts.set(k.to_id, (counts.get(k.to_id) || 0) + 1);
      }
    }
    const arr = [];
    for (const [userId, count] of counts.entries()) arr.push({ userId, count });
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 10);
  }, [kudos]);

  /* ─── 칭찬 — 나의 받은/보낸 (user 기준) ─── */
  const myKudosSplit = useMemo(() => {
    const received = [], sent = [];
    if (!user) return { received, sent };
    for (const k of kudos) {
      if (k.to_id === user.id) received.push(k);
      if (k.from_id === user.id) sent.push(k);
    }
    return { received: received.slice(0, 20), sent: sent.slice(0, 20) };
  }, [kudos, user]);

  const myReceivedKudos = myKudosSplit.received;
  const mySentKudos = myKudosSplit.sent;

  /* ─── 활성 미션 ─── */
  const activeMissions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return missions.filter((m) => {
      if (m.status !== 'active') return false;
      if (m.end_date && m.end_date < today) return false;
      return true;
    });
  }, [missions]);

  const getMyProgress = useCallback(
    (missionId) => progresses.find((p) => p.mission_id === missionId && p.user_id === user?.id) || null,
    [progresses, user]
  );

  const myPurchases = useMemo(
    () => purchases.filter((p) => p.user_id === user?.id),
    [purchases, user]
  );

  /* ─── 체크인 파생값 ─── */
  const myCheckinData = useMemo(() => {
    if (!user) return { todayCheckin: null, streak: 0 };

    const today = todayStr();
    const yesterday = yesterdayStr();
    const myCheckins = checkins.filter((c) => c.user_id === user.id);
    if (myCheckins.length === 0) return { todayCheckin: null, streak: 0 };

    const dateSet = new Set(myCheckins.map((c) => c.checkin_date));
    const todayCheckin = myCheckins.find((c) => c.checkin_date === today) || null;

    let streak = 0;
    if (dateSet.has(today) || dateSet.has(yesterday)) {
      const startDate = dateSet.has(today) ? today : yesterday;
      const d = new Date(startDate);
      while (dateSet.has(ymd(d))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
    }
    return { todayCheckin, streak };
  }, [checkins, user]);

  const todayCheckin = myCheckinData.todayCheckin;
  const currentStreak = myCheckinData.streak;

  /* ─── 자동 미션 활동 카운트 ─── */
  const weeklyActivityCounts = useMemo(() => {
    if (!user) return {};
    const counts = {
      kudos_sent: 0, ask_resolved: 0, task_done: 0, idea_created: 0,
      approval_processed: 0, cowork_session: 0, standup_written: 0, wiki_promoted: 0,
    };

    // 칭찬 보내기
    for (const k of kudos) {
      if (k.from_id === user.id && new Date(k.created_at).getTime() >= thisWeekMondayTs) {
        counts.kudos_sent++;
      }
    }

    // Ask 해결
    if (askRequests) {
      for (const r of askRequests) {
        if (r.helper_id === user.id && r.status === 'resolved' &&
            r.resolved_at && new Date(r.resolved_at).getTime() >= thisWeekMondayTs) {
          counts.ask_resolved++;
        }
      }
    }

    // 태스크 완료
    if (projectTasks) {
      for (const t of projectTasks) {
        const isMine = t.assignee_id === user.id || (t.assignee_ids || []).includes(user.id);
        if (isMine && t.status === 'done' && t.updated_at &&
            new Date(t.updated_at).getTime() >= thisWeekMondayTs) {
          counts.task_done++;
        }
      }
    }

    // 아이디어 카드 + 위키 승격
    if (ideaCards) {
      for (const c of ideaCards) {
        if (c.author_id !== user.id) continue;
        if (new Date(c.created_at).getTime() >= thisWeekMondayTs) {
          counts.idea_created++;
        }
        if (c.status === 'promoted' && c.promoted_at &&
            new Date(c.promoted_at).getTime() >= thisWeekMondayTs) {
          counts.wiki_promoted++;
        }
      }
    }

    // 결재 처리
    if (approvalApprovals) {
      for (const a of approvalApprovals) {
        if (!a.processed_at) continue;
        if (new Date(a.processed_at).getTime() < thisWeekMondayTs) continue;
        const apvs = a.approvers || [];
        if (apvs.some((ap) => ap.user_id === user.id &&
            (ap.status === 'approved' || ap.status === 'rejected'))) {
          counts.approval_processed++;
        }
      }
    }

    // 코워크 세션 (호스트 + 멤버, 중복 제거)
    if (coworkSessions && coworkMembers) {
      const sessionIds = new Set();
      for (const s of coworkSessions) {
        if (s.host_id === user.id && new Date(s.started_at).getTime() >= thisWeekMondayTs) {
          sessionIds.add(s.id);
        }
      }
      for (const m of coworkMembers) {
        if (m.user_id === user.id && new Date(m.joined_at).getTime() >= thisWeekMondayTs) {
          sessionIds.add(m.session_id);
        }
      }
      counts.cowork_session = sessionIds.size;
    }

    // 스탠드업
    if (standupStandups) {
      for (const s of standupStandups) {
        if (s.user_id === user.id && new Date(s.created_at).getTime() >= thisWeekMondayTs) {
          counts.standup_written++;
        }
      }
    }

    return counts;
  }, [
    user, thisWeekMondayTs, kudos,
    askRequests, projectTasks, ideaCards, approvalApprovals,
    coworkSessions, coworkMembers, standupStandups,
  ]);

  const autoMissionProgress = useMemo(() => {
    if (!user) return [];
    return autoMissions
      .filter((am) => am.status === 'active')
      .map((am) => {
        const achieved = weeklyActivityCounts[am.activity_type] || 0;
        const target = am.target_count;
        const completed = achieved >= target;
        const claimed = autoClaims.some(
          (c) => c.user_id === user.id && c.auto_mission_id === am.id &&
            c.week_start === thisWeekMondayStr
        );
        return {
          ...am, achieved, target,
          percent: Math.min(100, (achieved / target) * 100),
          completed, claimed,
        };
      });
  }, [autoMissions, weeklyActivityCounts, autoClaims, user, thisWeekMondayStr]);

  /* ─── 후기 파생값 — 한 번에 계산 ─── */
  const reviewData = useMemo(() => {
    const byProduct = {};
    const ratings = {};
    for (const r of reviews) {
      if (!byProduct[r.product_id]) byProduct[r.product_id] = [];
      byProduct[r.product_id].push(r);
    }
    for (const pid in byProduct) {
      const list = byProduct[pid];
      const sum = list.reduce((s, r) => s + r.rating, 0);
      ratings[pid] = {
        average: Math.round((sum / list.length) * 10) / 10,
        count: list.length,
      };
    }
    return { byProduct, ratings };
  }, [reviews]);

  const reviewsByProduct = reviewData.byProduct;
  const productRatings = reviewData.ratings;

  const helpfulsByReview = useCallback(
    (reviewId) => {
      let count = 0, mine = false;
      for (const h of helpfuls) {
        if (h.review_id === reviewId) {
          count++;
          if (h.user_id === user?.id) mine = true;
        }
      }
      return { count, mine };
    },
    [helpfuls, user]
  );

  /* ─── 칭찬 반응 ─── */
  const reactionsByKudos = useCallback(
    (kudosId) => {
      const counts = {};
      const mine = new Set();
      let total = 0;
      for (const r of kudosReactions) {
        if (r.kudos_id === kudosId) {
          counts[r.emoji] = (counts[r.emoji] || 0) + 1;
          if (r.user_id === user?.id) mine.add(r.emoji);
          total++;
        }
      }
      return { counts, mine, total };
    },
    [kudosReactions, user]
  );

  const weeklyTopKudos = useMemo(() => {
    // 반응 카운트를 미리 계산 (한 번만)
    const reactionCountByKudos = new Map();
    for (const r of kudosReactions) {
      reactionCountByKudos.set(r.kudos_id, (reactionCountByKudos.get(r.kudos_id) || 0) + 1);
    }

    return kudos
      .filter((k) => new Date(k.created_at).getTime() >= thisWeekMondayTs)
      .map((k) => ({ ...k, reactionCount: reactionCountByKudos.get(k.id) || 0 }))
      .sort((a, b) => {
        if (b.reactionCount !== a.reactionCount) return b.reactionCount - a.reactionCount;
        return new Date(b.created_at) - new Date(a.created_at);
      })
      .slice(0, 10);
  }, [kudos, kudosReactions, thisWeekMondayTs]);

  /* ─── 뱃지 파생값 ─── */
  const myActivityStats = useMemo(() => {
    if (!user) return null;

    let kudosReceived = 0, kudosSent = 0;
    for (const k of kudos) {
      if (k.to_id === user.id) kudosReceived++;
      if (k.from_id === user.id) kudosSent++;
    }

    let totalCheckinsCount = 0;
    for (const c of checkins) {
      if (c.user_id === user.id) totalCheckinsCount++;
    }

    let missionCleared = 0;
    for (const p of progresses) {
      if (p.user_id === user.id && p.status === 'completed') missionCleared++;
    }
    for (const c of autoClaims) {
      if (c.user_id === user.id) missionCleared++;
    }

    let askResolved = 0;
    if (askRequests) {
      for (const r of askRequests) {
        if (r.helper_id === user.id && r.status === 'resolved') askResolved++;
      }
    }

    let tasksDone = 0;
    if (projectTasks) {
      for (const t of projectTasks) {
        const isMine = t.assignee_id === user.id || (t.assignee_ids || []).includes(user.id);
        if (isMine && t.status === 'done') tasksDone++;
      }
    }

    return {
      kudos_received: kudosReceived,
      kudos_sent: kudosSent,
      checkin_streak: currentStreak,
      total_checkins: totalCheckinsCount,
      mission_cleared: missionCleared,
      ask_resolved: askResolved,
      tasks_done: tasksDone,
    };
  }, [user, kudos, currentStreak, checkins, progresses, autoClaims, askRequests, projectTasks]);

  /* 본인의 뱃지 목록 */
  const myBadges = useMemo(() => {
    if (!user) return [];
    const badgeById = {};
    for (const b of badges) badgeById[b.id] = b;

    const result = [];
    for (const ub of userBadges) {
      if (ub.user_id !== user.id) continue;
      const badge = badgeById[ub.badge_id];
      if (badge) result.push({ ...ub, badge });
    }
    return result;
  }, [userBadges, badges, user]);

  const featuredBadge = useMemo(() => {
    const featured = myBadges.find((b) => b.is_featured);
    return featured?.badge || null;
  }, [myBadges]);

  const badgeProgress = useMemo(() => {
    if (!user || !myActivityStats) return [];
    const myUbMap = new Map();
    for (const ub of userBadges) {
      if (ub.user_id === user.id) myUbMap.set(ub.badge_id, ub);
    }
    return badges.map((b) => {
      const earned = myUbMap.get(b.id);
      const current = myActivityStats[b.condition_type] || 0;
      const target = b.condition_value;
      return {
        ...b,
        current, target,
        percent: Math.min(100, (current / target) * 100),
        earned: !!earned,
        earnedAt: earned?.earned_at || null,
        isFeatured: earned?.is_featured || false,
      };
    });
  }, [badges, userBadges, user, myActivityStats]);

  const badgeCountByUser = useMemo(() => {
    const map = {};
    for (const ub of userBadges) {
      map[ub.user_id] = (map[ub.user_id] || 0) + 1;
    }
    return map;
  }, [userBadges]);

  const featuredBadgeByUser = useCallback(
    (uid) => {
      const ub = userBadges.find((x) => x.user_id === uid && x.is_featured);
      if (!ub) return null;
      return badges.find((b) => b.id === ub.badge_id) || null;
    },
    [userBadges, badges]
  );

  /* ─── 뱃지 자동 획득 — ref로 무한 평가 방지 ─── */
  const earningRef = useRef(false);

  useEffect(() => {
    if (!user || !myActivityStats || badges.length === 0) return;
    if (earningRef.current) return; // 이미 평가 중이면 스킵

    /* 신규 획득 후보 계산 */
    const myEarnedIds = new Set();
    for (const ub of userBadges) {
      if (ub.user_id === user.id) myEarnedIds.add(ub.badge_id);
    }

    const toEarn = [];
    for (const b of badges) {
      if (myEarnedIds.has(b.id)) continue;
      const current = myActivityStats[b.condition_type] || 0;
      if (current >= b.condition_value) toEarn.push(b);
    }

    if (toEarn.length === 0) return;

    earningRef.current = true;
    (async () => {
      try {
        for (const badge of toEarn) {
          try {
            const { data, error } = await supabase
              .from('hub_user_badges')
              .insert([{ user_id: user.id, badge_id: badge.id }])
              .select()
              .single();
            if (error && error.code !== '23505') continue;
            if (data && mountedRef.current) {
              setUserBadges((prev) => [data, ...prev]);
              setRecentBadge(badge);
            }
          } catch {}
        }
      } finally {
        earningRef.current = false;
      }
    })();
  }, [myActivityStats, badges, user, userBadges]);

  /* ─── 액션 — 칭찬 ─── */
  const sendKudos = useCallback(async ({ toId, message, tag }) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    if (toId === user.id) return { ok: false, error: '본인에게는 보낼 수 없어요.' };
    try {
      const { data, error } = await supabase
        .from('hub_kudos')
        .insert([{ from_id: user.id, to_id: toId, message, tag, points: 10 }])
        .select()
        .single();
      if (error) throw error;
      if (mountedRef.current) setKudos((prev) => [data, ...prev]);

      const senderName = user.user_metadata?.name || user.email?.split('@')[0] || '동료';
      const tagLabel = KUDOS_TAGS.find((t) => t.id === tag)?.label || '칭찬';
      createNotification({
        toUserId: toId,
        type: 'kudos',
        title: `${tagLabel} 칭찬을 받았어요 💛`,
        body: `${senderName}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        link: '/injoyhub',
        refId: data.id,
      });

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || '전송 실패' };
    }
  }, [user, createNotification]);

  /* ─── 액션 — 미션 ─── */
  const joinMission = useCallback(async (missionId) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    try {
      const { data, error } = await supabase
        .from('hub_mission_progress')
        .insert([{ mission_id: missionId, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      if (mountedRef.current) setProgresses((prev) => [...prev, data]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.code === '23505' ? '이미 참여 중인 미션이에요.' : (e.message || '실패') };
    }
  }, [user]);

  const completeMission = useCallback(async (progressId) => {
    try {
      const { data, error } = await supabase
        .from('hub_mission_progress')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', progressId)
        .select()
        .single();
      if (error) throw error;
      if (mountedRef.current) {
        setProgresses((prev) => prev.map((p) => (p.id === progressId ? data : p)));
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || '실패' };
    }
  }, []);

  const leaveMission = useCallback(async (progressId) => {
    try {
      const { error } = await supabase.from('hub_mission_progress').delete().eq('id', progressId);
      if (error) throw error;
      if (mountedRef.current) setProgresses((prev) => prev.filter((p) => p.id !== progressId));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const createMission = useCallback(async (payload) => {
    if (!user) return { ok: false };
    try {
      const { data, error } = await supabase
        .from('hub_missions')
        .insert([{ ...payload, created_by: user.id }])
        .select()
        .single();
      if (error) throw error;
      if (mountedRef.current) setMissions((prev) => [data, ...prev]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const updateMission = useCallback(async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('hub_missions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (mountedRef.current) setMissions((prev) => prev.map((m) => (m.id === id ? data : m)));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const deleteMission = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('hub_missions').delete().eq('id', id);
      if (error) throw error;
      if (mountedRef.current) setMissions((prev) => prev.filter((m) => m.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /* ─── 액션 — 상점 ─── */
  const purchaseProduct = useCallback(async (productId) => {
    try {
      const { data, error } = await supabase.rpc('purchase_hub_product', { p_product_id: productId });
      if (error) throw error;
      await Promise.all([fetchProducts(), fetchPurchases()]);
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [fetchProducts, fetchPurchases]);

  const useMyPurchase = useCallback(async (purchaseId, note) => {
    try {
      const { data, error } = await supabase.rpc('use_hub_purchase', {
        p_purchase_id: purchaseId, p_note: note || null,
      });
      if (error) throw error;
      await fetchPurchases();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [fetchPurchases]);

  const createProduct = useCallback(async (product) => {
    if (!user) return { ok: false };
    try {
      const { data, error } = await supabase
        .from('hub_products')
        .insert([{ ...product, created_by: user.id }])
        .select().single();
      if (error) throw error;
      if (mountedRef.current) setProducts((prev) => [data, ...prev]);
      return { ok: true, product: data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const updateProduct = useCallback(async (id, patch) => {
    try {
      const { error } = await supabase
        .from('hub_products')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      if (mountedRef.current) {
        setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const deleteProduct = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('hub_products').delete().eq('id', id);
      if (error) throw error;
      if (mountedRef.current) setProducts((prev) => prev.filter((p) => p.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /* ─── 액션 — 체크인 ─── */
  const checkIn = useCallback(async ({ mood, note }) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    const today = todayStr();
    const yesterday = yesterdayStr();
    if (todayCheckin) return { ok: false, error: '오늘은 이미 체크인했어요.' };

    const yesterdayCheckin = checkins.find(
      (c) => c.user_id === user.id && c.checkin_date === yesterday
    );
    const newStreakDay = yesterdayCheckin ? (yesterdayCheckin.streak_day + 1) : 1;
    const pointsEarned = newStreakDay * 5;

    try {
      const { data, error } = await supabase
        .from('hub_checkins')
        .insert([{
          user_id: user.id,
          checkin_date: today,
          mood: mood || 'neutral',
          note: (note || '').trim() || null,
          streak_day: newStreakDay,
          points_earned: pointsEarned,
        }])
        .select().single();
      if (error) throw error;
      if (mountedRef.current) setCheckins((prev) => [data, ...prev]);
      return { ok: true, checkin: data, pointsEarned, streakDay: newStreakDay };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user, todayCheckin, checkins]);

  const updateTodayNote = useCallback(async (note) => {
    if (!user || !todayCheckin) return { ok: false };
    try {
      const { data, error } = await supabase
        .from('hub_checkins')
        .update({ note: (note || '').trim() || null })
        .eq('id', todayCheckin.id)
        .select().single();
      if (error) throw error;
      if (mountedRef.current) {
        setCheckins((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user, todayCheckin]);

  /* ─── 액션 — 자동 미션 ─── */
  const claimAutoMission = useCallback(async (autoMissionId) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    const am = autoMissions.find((m) => m.id === autoMissionId);
    if (!am) return { ok: false, error: '미션을 찾을 수 없어요.' };

    const achieved = weeklyActivityCounts[am.activity_type] || 0;
    if (achieved < am.target_count) return { ok: false, error: '아직 달성하지 못했어요.' };

    const already = autoClaims.find(
      (c) => c.user_id === user.id && c.auto_mission_id === autoMissionId &&
        c.week_start === thisWeekMondayStr
    );
    if (already) return { ok: false, error: '이미 받은 보상이에요.' };

    try {
      const { data, error } = await supabase
        .from('hub_auto_mission_claims')
        .insert([{
          user_id: user.id,
          auto_mission_id: autoMissionId,
          week_start: thisWeekMondayStr,
          achieved_count: achieved,
          points_earned: am.points,
        }])
        .select().single();
      if (error) throw error;
      if (mountedRef.current) setAutoClaims((prev) => [data, ...prev]);
      return { ok: true, points: am.points };
    } catch (e) {
      if (e.code === '23505') return { ok: false, error: '이미 받은 보상이에요.' };
      return { ok: false, error: e.message };
    }
  }, [user, autoMissions, weeklyActivityCounts, autoClaims, thisWeekMondayStr]);

  const createAutoMission = useCallback(async (payload) => {
    if (!user) return { ok: false };
    try {
      const { data, error } = await supabase
        .from('hub_auto_missions')
        .insert([{ ...payload, created_by: user.id, is_seed: false }])
        .select().single();
      if (error) throw error;
      if (mountedRef.current) setAutoMissions((prev) => [...prev, data]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const updateAutoMission = useCallback(async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from('hub_auto_missions').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (mountedRef.current) setAutoMissions((prev) => prev.map((m) => (m.id === id ? data : m)));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  const deleteAutoMission = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('hub_auto_missions').delete().eq('id', id);
      if (error) throw error;
      if (mountedRef.current) setAutoMissions((prev) => prev.filter((m) => m.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, []);

  /* ─── 액션 — 후기 ─── */
  const createReview = useCallback(async ({ productId, purchaseId, rating, content }) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    if (!rating || rating < 1 || rating > 5) return { ok: false, error: '별점을 선택해주세요.' };
    if (!content.trim()) return { ok: false, error: '후기 내용을 입력해주세요.' };

    try {
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || '동료';
      const { data, error } = await supabase
        .from('hub_product_reviews')
        .insert([{
          product_id: productId, purchase_id: purchaseId,
          user_id: user.id, user_name: userName,
          rating, content: content.trim(), points_earned: 20,
        }])
        .select().single();
      if (error) throw error;
      if (mountedRef.current) setReviews((prev) => [data, ...prev]);
      return { ok: true, review: data, points: 20 };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const updateReview = useCallback(async (reviewId, { rating, content }) => {
    if (!user) return { ok: false };
    try {
      const { data, error } = await supabase
        .from('hub_product_reviews')
        .update({ rating, content: content.trim() })
        .eq('id', reviewId).eq('user_id', user.id)
        .select().single();
      if (error) throw error;
      if (mountedRef.current) setReviews((prev) => prev.map((r) => (r.id === reviewId ? data : r)));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const deleteReview = useCallback(async (reviewId) => {
    if (!user) return { ok: false };
    try {
      const { error } = await supabase
        .from('hub_product_reviews').delete()
        .eq('id', reviewId).eq('user_id', user.id);
      if (error) throw error;
      if (mountedRef.current) setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const toggleHelpful = useCallback(async (reviewId) => {
    if (!user) return { ok: false };
    const existing = helpfuls.find(
      (h) => h.review_id === reviewId && h.user_id === user.id
    );
    try {
      if (existing) {
        const { error } = await supabase
          .from('hub_review_helpfuls').delete().eq('id', existing.id);
        if (error) throw error;
        if (mountedRef.current) setHelpfuls((prev) => prev.filter((h) => h.id !== existing.id));
      } else {
        const { data, error } = await supabase
          .from('hub_review_helpfuls')
          .insert([{ review_id: reviewId, user_id: user.id }])
          .select().single();
        if (error) throw error;
        if (mountedRef.current) setHelpfuls((prev) => [...prev, data]);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user, helpfuls]);

  /* ─── 액션 — 칭찬 반응 ─── */
  const toggleKudosReaction = useCallback(async (kudosId, emoji) => {
    if (!user) return { ok: false };
    const existing = kudosReactions.find(
      (r) => r.kudos_id === kudosId && r.user_id === user.id && r.emoji === emoji
    );
    try {
      if (existing) {
        const { error } = await supabase
          .from('hub_kudos_reactions').delete().eq('id', existing.id);
        if (error) throw error;
        if (mountedRef.current) setKudosReactions((prev) => prev.filter((r) => r.id !== existing.id));
      } else {
        const { data, error } = await supabase
          .from('hub_kudos_reactions')
          .insert([{ kudos_id: kudosId, user_id: user.id, emoji }])
          .select().single();
        if (error) throw error;
        if (mountedRef.current) setKudosReactions((prev) => [data, ...prev]);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user, kudosReactions]);

  /* ─── 액션 — 뱃지 ─── */
  const setFeaturedBadge = useCallback(async (badgeId) => {
    if (!user) return { ok: false };
    try {
      await supabase
        .from('hub_user_badges').update({ is_featured: false })
        .eq('user_id', user.id).eq('is_featured', true);

      if (!badgeId) {
        if (mountedRef.current) {
          setUserBadges((prev) =>
            prev.map((ub) => ub.user_id === user.id ? { ...ub, is_featured: false } : ub)
          );
        }
        return { ok: true };
      }

      const { error } = await supabase
        .from('hub_user_badges')
        .update({ is_featured: true })
        .eq('user_id', user.id).eq('badge_id', badgeId);
      if (error) throw error;

      if (mountedRef.current) {
        setUserBadges((prev) =>
          prev.map((ub) => {
            if (ub.user_id !== user.id) return ub;
            return { ...ub, is_featured: ub.badge_id === badgeId };
          })
        );
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user]);

  const clearRecentBadge = useCallback(() => setRecentBadge(null), []);

  /* ─── 모달 컨트롤 ─── */
  const openSendKudos = useCallback((presetTarget = null) => {
    setSendKudosModal({ open: true, presetTarget });
  }, []);
  const closeSendKudos = useCallback(() => {
    setSendKudosModal({ open: false, presetTarget: null });
  }, []);

  const openMissionEditor = useCallback((mission = null) => {
    setMissionEditorModal({ open: true, mission });
  }, []);
  const closeMissionEditor = useCallback(() => {
    setMissionEditorModal({ open: false, mission: null });
  }, []);

  const openCheckinModal = useCallback(() => setCheckinModalOpen(true), []);
  const closeCheckinModal = useCallback(() => setCheckinModalOpen(false), []);

  /* ─── Provider value — 안정화된 객체 ─── */
  const value = useMemo(() => ({
    loading, marketLoading,
    kudos, missions, progresses,
    products, purchases, myPurchases,
    myStats, myPoints, userPoints, monthlyRanking,
    myReceivedKudos, mySentKudos,
    activeMissions, getMyProgress,
    sendKudos, joinMission, completeMission, leaveMission,
    createMission, updateMission, deleteMission,
    purchaseProduct, useMyPurchase,
    createProduct, updateProduct, deleteProduct,
    fetchProducts, fetchPurchases,
    sendKudosModal, openSendKudos, closeSendKudos,
    missionEditorModal, openMissionEditor, closeMissionEditor,
    /* 체크인 */
    checkins, todayCheckin, currentStreak,
    checkinModalOpen, openCheckinModal, closeCheckinModal,
    checkIn, updateTodayNote, fetchCheckins,
    /* 자동 미션 */
    autoMissions, autoMissionProgress, autoClaims,
    weeklyActivityCounts, thisWeekMondayStr,
    claimAutoMission, createAutoMission, updateAutoMission, deleteAutoMission,
    fetchAutoMissions,
    /* 후기 */
    reviews, reviewsByProduct, productRatings, helpfulsByReview,
    createReview, updateReview, deleteReview, toggleHelpful,
    fetchReviews, fetchHelpfuls,
    /* 칭찬 반응 */
    kudosReactions, reactionsByKudos, weeklyTopKudos,
    toggleKudosReaction, fetchKudosReactions,
    /* 뱃지 */
    badges, userBadges,
    myBadges, featuredBadge, badgeProgress, myActivityStats,
    badgeCountByUser, featuredBadgeByUser,
    recentBadge, clearRecentBadge,
    setFeaturedBadge,
    fetchBadges, fetchUserBadges,
    refresh,
  }), [
    loading, marketLoading,
    kudos, missions, progresses, products, purchases, myPurchases,
    myStats, myPoints, userPoints, monthlyRanking,
    myReceivedKudos, mySentKudos, activeMissions, getMyProgress,
    sendKudos, joinMission, completeMission, leaveMission,
    createMission, updateMission, deleteMission,
    purchaseProduct, useMyPurchase, createProduct, updateProduct, deleteProduct,
    fetchProducts, fetchPurchases,
    sendKudosModal, openSendKudos, closeSendKudos,
    missionEditorModal, openMissionEditor, closeMissionEditor,
    checkins, todayCheckin, currentStreak,
    checkinModalOpen, openCheckinModal, closeCheckinModal,
    checkIn, updateTodayNote, fetchCheckins,
    autoMissions, autoMissionProgress, autoClaims,
    weeklyActivityCounts, thisWeekMondayStr,
    claimAutoMission, createAutoMission, updateAutoMission, deleteAutoMission,
    fetchAutoMissions,
    reviews, reviewsByProduct, productRatings, helpfulsByReview,
    createReview, updateReview, deleteReview, toggleHelpful,
    fetchReviews, fetchHelpfuls,
    kudosReactions, reactionsByKudos, weeklyTopKudos,
    toggleKudosReaction, fetchKudosReactions,
    badges, userBadges,
    myBadges, featuredBadge, badgeProgress, myActivityStats,
    badgeCountByUser, featuredBadgeByUser,
    recentBadge, clearRecentBadge, setFeaturedBadge,
    fetchBadges, fetchUserBadges, refresh,
  ]);

  return (
    <HubContext.Provider value={value}>
      {children}
    </HubContext.Provider>
  );
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub must be used within HubProvider');
  return ctx;
}