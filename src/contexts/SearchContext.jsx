// contexts/SearchContext.jsx
// D2/D3 — 전역 통합 검색 + 명령 팔레트.
//
// - 어디서든 openPalette() 호출하면 ⌘K 모달 열림
// - Ctrl/Cmd + K 단축키도 글로벌 등록
// - 검색어 변경 시 350ms 디바운스 후 7개 소스 병렬 fetch
// - 결과는 카테고리별로 그룹핑되어 노출됨

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const SearchContext = createContext(null);

const DEBOUNCE_MS = 350;
const PER_SOURCE_LIMIT = 5;

/* 결과 카테고리 메타 */
export const SEARCH_CATEGORIES = {
  action: {
    label: '바로가기',
    icon: 'fa-bolt',
    color: '#f59e0b',
    order: 0,
  },
  post: {
    label: '게시판',
    icon: 'fa-clipboard-list',
    color: '#4361ee',
    order: 1,
  },
  wiki: {
    label: '위키',
    icon: 'fa-book',
    color: '#06d6a0',
    order: 2,
  },
  task: {
    label: '태스크',
    icon: 'fa-list-check',
    color: '#8338ec',
    order: 3,
  },
  schedule: {
    label: '일정',
    icon: 'fa-calendar-day',
    color: '#ff9f1c',
    order: 4,
  },
  member: {
    label: '구성원',
    icon: 'fa-users',
    color: '#ec4899',
    order: 5,
  },
  mail: {
    label: '메일',
    icon: 'fa-envelope',
    color: '#4361ee',
    order: 6,
  },
  training: {
    label: '교육',
    icon: 'fa-graduation-cap',
    color: '#f59e0b',
    order: 7,
  },
};

/* Quick Actions — 검색어와 매칭되면 항상 상단에 나타남 */
const QUICK_ACTIONS = [
  { id: 'go-dashboard',   keywords: ['대시보드', 'dashboard', '홈'],
    title: '대시보드로 이동', icon: 'fa-house', link: '/' },
  { id: 'go-board',       keywords: ['게시판', 'board'],
    title: '게시판으로 이동', icon: 'fa-clipboard-list', link: '/board' },
  { id: 'go-approval',    keywords: ['결재', 'approval'],
    title: '전자결재로 이동', icon: 'fa-stamp', link: '/approval' },
  { id: 'go-leave',       keywords: ['연차', '휴가', 'leave'],
    title: '연차 관리로 이동', icon: 'fa-umbrella-beach', link: '/leave' },
  { id: 'go-schedule',    keywords: ['일정', '캘린더', 'schedule', 'calendar'],
    title: '일정으로 이동', icon: 'fa-calendar', link: '/schedule' },
  { id: 'go-wiki',        keywords: ['위키', 'wiki'],
    title: '사내 위키로 이동', icon: 'fa-book', link: '/wiki' },
  { id: 'go-mail',        keywords: ['메일', 'mail', '이메일'],
    title: '메일함으로 이동', icon: 'fa-envelope', link: '/mail' },
  { id: 'go-project',     keywords: ['프로젝트', '태스크', 'project', 'task'],
    title: '프로젝트로 이동', icon: 'fa-diagram-project', link: '/project' },
  { id: 'go-orgchart',    keywords: ['조직도', '구성원', 'orgchart'],
    title: '조직도로 이동', icon: 'fa-sitemap', link: '/orgchart' },
  { id: 'go-meetingroom', keywords: ['회의실', 'meeting', '예약'],
    title: '회의실 예약으로 이동', icon: 'fa-door-open', link: '/meetingroom' },
  { id: 'go-expenses',    keywords: ['정산', '경비', '법인카드', 'expense'],
    title: '경비 정산으로 이동', icon: 'fa-receipt', link: '/expenses' },
  { id: 'go-training',    keywords: ['교육', '연수', 'training'],
    title: '교육/연수로 이동', icon: 'fa-graduation-cap', link: '/training' },
  { id: 'go-injoyhub',    keywords: ['hub', '칭찬', '미션', '허브'],
    title: 'INJOY Hub로 이동', icon: 'fa-trophy', link: '/injoyhub' },
  { id: 'go-wellbeing',   keywords: ['웰빙', '체크인', 'wellbeing', '기분'],
    title: 'Well-being으로 이동', icon: 'fa-heart-pulse', link: '/wellbeing' },
  { id: 'go-resources',   keywords: ['자료', '파일', 'resource'],
    title: '자료실로 이동', icon: 'fa-folder', link: '/resource' },
];

export function SearchProvider({ children }) {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState({});  // { post: [], wiki: [], ... }
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);  // 경쟁 상태 방지

  /* 팔레트 제어 */
  const openPalette = useCallback(() => {
    setOpen(true);
  }, []);
  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
    setResults({});
  }, []);

  /* ⌘K / Ctrl+K 전역 단축키 + Esc 닫기 */
useEffect(() => {
  const handler = (e) => {
    // ⌘K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setOpen((v) => !v);
      return;
    }
    // Esc
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      closePalette();
    }
  };
  
  /* ⭐ 추가 — 단축키 시스템에서 보내는 신호 받기 */
  const openHandler = () => setOpen(true);
  
  window.addEventListener('keydown', handler);
  window.addEventListener('nexus:shortcut:open-palette', openHandler);  // ⭐
  
  return () => {
    window.removeEventListener('keydown', handler);
    window.removeEventListener('nexus:shortcut:open-palette', openHandler);  // ⭐
  };
}, [open, closePalette]);

  /* 디바운스 */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  /* 실제 검색 실행 */
  const runSearch = useCallback(async (q) => {
    if (!q || q.length < 1) {
      setResults({});
      setLoading(false);
      return;
    }

    /* 경쟁 상태 방지 — 더 새로운 요청이 있으면 폐기 */
    const reqId = ++reqIdRef.current;
    setLoading(true);

    const like = `%${q}%`;

    try {
      const settled = await Promise.allSettled([
        // 1) 게시글
supabase
          .from('posts')
          .select('id, title, content, author_name, category, created_at')
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`) // 변수 q를 직접 넣습니다.
          .order('created_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),
        // 2) 위키
        supabase
          .from('wiki_documents')
          .select('id, title, content, author_name, updated_at')
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
          .order('updated_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),
        // 3) 태스크
        supabase
          .from('tasks')
          .select('id, title, description, status, project_id, priority, due_date')
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),
        // 4) 일정
supabase
  .from('schedule_events')
  .select('id, title, description, category, start_at')
  .or(`title.ilike.${like},description.ilike.${like}`)
  .order('start_at', { ascending: false })
  .limit(PER_SOURCE_LIMIT),
        // 5) 구성원
        supabase
          .from('profiles')
          .select('id, full_name, department, avatar_url')
          .or(`full_name.ilike.${like},department.ilike.${like}`)
          .order('full_name')
          .limit(PER_SOURCE_LIMIT),
        // 6) 메일 — 내가 받았거나 보낸 것만
        user
          ? supabase
              .from('mail_messages')
              .select('id, subject, body, sender_id, created_at')
              .or(`subject.ilike.${like},body.ilike.${like}`)
              .order('created_at', { ascending: false })
              .limit(PER_SOURCE_LIMIT)
          : Promise.resolve({ data: [], error: null }),
        // 7) 교육
        supabase
          .from('training_courses')
          .select('id, title, description, category, instructor')
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(PER_SOURCE_LIMIT),
      ]);

      /* 더 새로운 요청이 시작됐다면 결과 무시 */
      if (reqId !== reqIdRef.current) return;

      const get = (idx) =>
        settled[idx].status === 'fulfilled' ? settled[idx].value.data || [] : [];

      /* Quick Actions 필터링 — 키워드 매칭 */
      const lq = q.toLowerCase();
      const actions = QUICK_ACTIONS.filter((a) =>
        a.keywords.some((k) => k.toLowerCase().includes(lq) || lq.includes(k.toLowerCase()))
      ).map((a) => ({
        ...a,
        type: 'action',
        link: a.link,
        text: a.title,
        sub: '바로가기',
      }));

      setResults({
        action: actions,
        post: get(0).map((r) => ({
          type: 'post',
          id: r.id,
          text: r.title,
          sub: r.author_name || '익명',
          extra: r.category,
          link: `/board?post=${r.id}`,
          time: r.created_at,
          snippet: extractSnippet(r.content, q),
        })),
        wiki: get(1).map((r) => ({
          type: 'wiki',
          id: r.id,
          text: r.title || '제목 없음',
          sub: r.author_name || '익명',
          link: `/wiki?doc=${r.id}`,
          time: r.updated_at,
          snippet: extractSnippet(r.content, q),
        })),
        task: get(2).map((r) => ({
          type: 'task',
          id: r.id,
          text: r.title,
          sub: r.status || '진행 상태',
          extra: r.priority,
          link: `/project?id=${r.project_id}&task=${r.id}`,
          snippet: extractSnippet(r.description, q),
        })),
        schedule: get(3).map((r) => ({
          type: 'schedule',
          id: r.id,
          text: r.title,
          sub: r.start_at ? new Date(r.start_at).toLocaleDateString('ko-KR') : '',
          extra: r.category,
          link: '/schedule',
          snippet: extractSnippet(r.description, q),
        })),
        member: get(4).map((r) => ({
          type: 'member',
          id: r.id,
          text: r.full_name || '이름 없음',
          sub: r.department || '미지정',
          avatar: r.avatar_url,
          link: `/orgchart?member=${r.id}`,
        })),
        mail: get(5).map((r) => ({
          type: 'mail',
          id: r.id,
          text: r.subject || '(제목 없음)',
          sub: '메일',
          link: '/mail',
          time: r.created_at,
          snippet: extractSnippet(r.body, q),
        })),
        training: get(6).map((r) => ({
          type: 'training',
          id: r.id,
          text: r.title,
          sub: r.instructor || '강사 미정',
          extra: r.category,
          link: '/training',
          snippet: extractSnippet(r.description, q),
        })),
      });
    } catch (err) {
      console.error('[Search] runSearch error:', err);
      if (reqId === reqIdRef.current) setResults({});
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [user]);

  /* 디바운스된 쿼리 → 실제 검색 트리거 */
  useEffect(() => {
    if (!open) return;
    runSearch(debouncedQuery);
  }, [debouncedQuery, open, runSearch]);

  /* 플랫한 결과 리스트 — 키보드 네비게이션용 */
  const flatResults = useMemo(() => {
    const order = Object.keys(SEARCH_CATEGORIES).sort(
      (a, b) => SEARCH_CATEGORIES[a].order - SEARCH_CATEGORIES[b].order
    );
    const out = [];
    order.forEach((cat) => {
      (results[cat] || []).forEach((item) => {
        out.push({ ...item, _category: cat });
      });
    });
    return out;
  }, [results]);

  /* 총 결과 수 */
  const totalCount = useMemo(
    () => flatResults.length,
    [flatResults]
  );

  return (
    <SearchContext.Provider
      value={{
        open,
        openPalette,
        closePalette,
        query,
        setQuery,
        results,
        flatResults,
        totalCount,
        loading,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

/* 검색어 주변 텍스트 스니펫 추출 (앞뒤 30자) */
function extractSnippet(content, query) {
  if (!content || !query) return '';
  const text = String(content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) {
    return text.length > 80 ? text.slice(0, 80) + '...' : text;
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 50);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return prefix + text.slice(start, end) + suffix;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}