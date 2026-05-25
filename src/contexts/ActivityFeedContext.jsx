// contexts/ActivityFeedContext.jsx
// D4 — 통합 활동 피드.
// 6개 소스에서 최근 이벤트 통합. 이름 컬럼 없는 테이블은 OrgChart.members로 매핑.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useOrgChart } from './OrgChartContext';

const ActivityFeedContext = createContext(null);

const PER_SOURCE_LIMIT = 8;
const TOTAL_LIMIT      = 20;

export const ACTIVITY_TYPES = {
  post: {
    icon: 'fa-clipboard-list',
    color: '#4361ee',
    label: '게시판',
    link: (row) => `/board?post=${row.id}`,
  },
  wiki: {
    icon: 'fa-book',
    color: '#06d6a0',
    label: '위키',
    link: () => '/wiki',
  },
  approval: {
    icon: 'fa-stamp',
    color: '#f72585',
    label: '결재',
    link: () => '/approval',
  },
  kudos: {
    icon: 'fa-heart',
    color: '#ec4899',
    label: '칭찬',
    link: () => '/injoyhub',
  },
  schedule: {
    icon: 'fa-calendar-day',
    color: '#8338ec',
    label: '일정',
    link: () => '/schedule',
  },
  training: {
    icon: 'fa-graduation-cap',
    color: '#f59e0b',
    label: '교육',
    link: () => '/training',
  },
};

export const ACTIVITY_CATEGORIES = [
  { value: 'all',      label: '전체 활동' },
  { value: 'post',     label: '게시판' },
  { value: 'wiki',     label: '위키' },
  { value: 'approval', label: '결재' },
  { value: 'kudos',    label: '칭찬' },
  { value: 'schedule', label: '일정' },
  { value: 'training', label: '교육' },
];

export function ActivityFeedProvider({ children }) {
  const { user } = useAuth();

  /* OrgChart 가 ActivityFeedProvider 보다 바깥에 있다고 가정.
     혹시 contexts 트리상 안쪽에 있다면 useOrgChart 가 throw 하므로
     try-catch 로 fallback. */
  let orgMembers = [];
  try {
    const oc = useOrgChart();
    orgMembers = oc?.members || [];
  } catch {
    orgMembers = [];
  }

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* id → 이름 매핑 헬퍼 */
  const findName = useCallback(
    (id) => {
      if (!id) return '익명';
      const m = orgMembers.find((u) => u.id === id);
      return m?.full_name || '익명';
    },
    [orgMembers]
  );

  /* 통합 fetch */
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        // 1) 게시글 — author_name 컬럼 존재 확인됨
        supabase
          .from('posts')
          .select('id, title, author_name, user_id, category, created_at')
          .order('created_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),

        // 2) 위키 — author_name 컬럼 존재 확인됨
        supabase
          .from('wiki_documents')
          .select('id, title, author_name, author_id, updated_at, created_at')
          .order('updated_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),

        // 3) 결재 — drafter_name 컬럼 존재
        supabase
          .from('approvals')
          .select('id, title, type, drafter_name, drafter_id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),

        // 4) 칭찬 — from_id/to_id만 있음 (이름 매핑 필요)
        supabase
          .from('hub_kudos')
          .select('id, message, tag, from_id, to_id, created_at')
          .order('created_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),

        // 5) 일정 — author_id만 있음. start_at 사용
        supabase
          .from('schedule_events')
          .select('id, title, category, author_id, start_at, created_at')
          .order('created_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),

        // 6) 교육 — created_by만 있음 (이름 매핑 필요)
        supabase
          .from('training_courses')
          .select('id, title, category, created_by, created_at')
          .order('created_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),
      ]);

      const merged = [];

      // posts
      if (results[0].status === 'fulfilled' && results[0].value.data) {
        results[0].value.data.forEach((r) => {
          merged.push({
            id: `post-${r.id}`,
            type: 'post',
            actor: r.author_name || findName(r.user_id),
            actorId: r.user_id,
            time: r.created_at,
            text: r.title || '(제목 없음)',
            subText: r.category || '자유게시판',
            raw: r,
          });
        });
      }

      // wiki
      if (results[1].status === 'fulfilled' && results[1].value.data) {
        results[1].value.data.forEach((r) => {
          const created = new Date(r.created_at).getTime();
          const updated = new Date(r.updated_at).getTime();
          const isNew = Math.abs(updated - created) < 60000;
          merged.push({
            id: `wiki-${r.id}`,
            type: 'wiki',
            actor: r.author_name || findName(r.author_id),
            actorId: r.author_id,
            time: r.updated_at,
            text: r.title || '제목 없음',
            subText: isNew ? '새 문서' : '수정됨',
            raw: r,
          });
        });
      }

      // approvals
      if (results[2].status === 'fulfilled' && results[2].value.data) {
        results[2].value.data.forEach((r) => {
          if (r.status === 'draft') return;
          merged.push({
            id: `approval-${r.id}`,
            type: 'approval',
            actor: r.drafter_name || findName(r.drafter_id),
            actorId: r.drafter_id,
            time: r.created_at,
            text: r.title || '제목 없음',
            subText: r.type || '결재',
            raw: r,
          });
        });
      }

      // kudos — 이름 매핑
      if (results[3].status === 'fulfilled' && results[3].value.data) {
        results[3].value.data.forEach((r) => {
          const fromName = findName(r.from_id);
          const toName = findName(r.to_id);
          merged.push({
            id: `kudos-${r.id}`,
            type: 'kudos',
            actor: fromName,
            actorId: r.from_id,
            time: r.created_at,
            text: `${toName} 님께 칭찬을 보냈어요`,
            subText: r.tag || '응원',
            raw: r,
          });
        });
      }

      // schedule — 이름 매핑
      if (results[4].status === 'fulfilled' && results[4].value.data) {
        results[4].value.data.forEach((r) => {
          merged.push({
            id: `schedule-${r.id}`,
            type: 'schedule',
            actor: findName(r.author_id),
            actorId: r.author_id,
            time: r.created_at,
            text: r.title || '제목 없음',
            subText: r.category || '일정',
            raw: r,
          });
        });
      }

      // training — 이름 매핑
      if (results[5].status === 'fulfilled' && results[5].value.data) {
        results[5].value.data.forEach((r) => {
          merged.push({
            id: `training-${r.id}`,
            type: 'training',
            actor: findName(r.created_by),
            actorId: r.created_by,
            time: r.created_at,
            text: r.title || '제목 없음',
            subText: r.category || '교육',
            raw: r,
          });
        });
      }

      merged.sort((a, b) => new Date(b.time) - new Date(a.time));
      const top = merged.slice(0, TOTAL_LIMIT);

      if (mountedRef.current) setItems(top);
    } catch (err) {
      console.error('[ActivityFeed] fetch error:', err);
      if (mountedRef.current) setItems([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [findName]);

  useEffect(() => {
    if (user) fetchActivities();
  }, [user, fetchActivities]);

  const filteredItems = useMemo(() => {
    if (category === 'all') return items;
    return items.filter((it) => it.type === category);
  }, [items, category]);

  const counts = useMemo(() => {
    const c = { all: items.length };
    items.forEach((it) => {
      c[it.type] = (c[it.type] || 0) + 1;
    });
    return c;
  }, [items]);

  return (
    <ActivityFeedContext.Provider
      value={{
        items: filteredItems,
        allItems: items,
        loading,
        category,
        setCategory,
        counts,
        refresh: fetchActivities,
      }}
    >
      {children}
    </ActivityFeedContext.Provider>
  );
}

export function useActivityFeed() {
  const ctx = useContext(ActivityFeedContext);
  if (!ctx) throw new Error('useActivityFeed must be used within ActivityFeedProvider');
  return ctx;
}