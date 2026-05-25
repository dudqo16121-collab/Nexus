// contexts/BookmarkContext.jsx
// 북마크/즐겨찾기 통합 시스템.
//
// 어디서든 useBookmark() 로:
//  - isBookmarked(kind, refId) — 북마크 여부
//  - toggleBookmark({ kind, refId, title, ... }) — 토글
//  - bookmarks — 전체 목록 (pinned + sort_order 순)
//  - pinnedBookmarks / unpinnedBookmarks — 분리된 목록
//  - togglePin(id) / removeBookmark(id) / reorder(...) 

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const BookmarkContext = createContext(null);

/* 북마크 종류 메타 — 기본 아이콘/색/라벨 */
export const BOOKMARK_KIND_META = {
  post: {
    label: '게시글',
    icon: 'fa-clipboard-list',
    color: '#4361ee',
  },
  wiki: {
    label: '위키',
    icon: 'fa-book',
    color: '#06d6a0',
  },
  approval_form: {
    label: '결재 양식',
    icon: 'fa-stamp',
    color: '#f72585',
  },
  task: {
    label: '태스크',
    icon: 'fa-list-check',
    color: '#8338ec',
  },
  event: {
    label: '일정',
    icon: 'fa-calendar-day',
    color: '#ff9f1c',
  },
  meeting_room: {
    label: '회의실',
    icon: 'fa-door-open',
    color: '#3aafa9',
  },
  training: {
    label: '교육',
    icon: 'fa-graduation-cap',
    color: '#f59e0b',
  },
  member: {
    label: '구성원',
    icon: 'fa-user',
    color: '#ec4899',
  },
  page: {
    label: '페이지',
    icon: 'fa-bookmark',
    color: '#6b7280',
  },
};

export function BookmarkProvider({ children }) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);

  /* 전체 fetch */
  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBookmarks(data || []);
    } catch (e) {
      console.error('[Bookmark] fetch:', e);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  /* 빠른 조회용 Set — kind:refId */
  const bookmarkedKeys = useMemo(() => {
    const s = new Set();
    bookmarks.forEach((b) => s.add(`${b.kind}:${b.ref_id || ''}`));
    return s;
  }, [bookmarks]);

  const isBookmarked = useCallback(
    (kind, refId) => bookmarkedKeys.has(`${kind}:${refId || ''}`),
    [bookmarkedKeys]
  );

  const findBookmark = useCallback(
    (kind, refId) =>
      bookmarks.find((b) => b.kind === kind && (b.ref_id || '') === (refId || '')),
    [bookmarks]
  );

  /* 토글 — 있으면 삭제, 없으면 추가 */
  const toggleBookmark = useCallback(
    async ({ kind, refId, title, subtitle, link, icon, color }) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };

      const existing = findBookmark(kind, refId);
      if (existing) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existing.id);
        if (error) {
          console.error('[Bookmark] delete:', error);
          return { ok: false, error: '삭제 실패' };
        }
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
        return { ok: true, removed: true };
      }

      const meta = BOOKMARK_KIND_META[kind] || BOOKMARK_KIND_META.page;
      const row = {
        user_id: user.id,
        kind,
        ref_id: refId ? String(refId) : null,
        title: (title || '제목 없음').slice(0, 200),
        subtitle: subtitle || null,
        link,
        icon: icon || meta.icon,
        color: color || meta.color,
      };

      const { data, error } = await supabase
        .from('bookmarks')
        .insert([row])
        .select()
        .single();
      if (error) {
        console.error('[Bookmark] insert:', error);
        return { ok: false, error: error.message || '저장 실패' };
      }
      setBookmarks((prev) => [data, ...prev]);
      return { ok: true, added: true };
    },
    [user, findBookmark]
  );

  /* 직접 제거 (id 기반) */
  const removeBookmark = useCallback(async (id) => {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) {
      console.error('[Bookmark] remove:', error);
      return { ok: false };
    }
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    return { ok: true };
  }, []);

  /* 핀 고정 토글 */
  const togglePin = useCallback(
    async (id) => {
      const target = bookmarks.find((b) => b.id === id);
      if (!target) return { ok: false };
      const next = !target.pinned;
      const { error } = await supabase
        .from('bookmarks')
        .update({ pinned: next })
        .eq('id', id);
      if (error) {
        console.error('[Bookmark] togglePin:', error);
        return { ok: false };
      }
      setBookmarks((prev) =>
        prev
          .map((b) => (b.id === id ? { ...b, pinned: next } : b))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return b.pinned - a.pinned;
            return (a.sort_order || 0) - (b.sort_order || 0);
          })
      );
      return { ok: true };
    },
    [bookmarks]
  );

  /* 분리 — 핀/일반 */
  const pinnedBookmarks = useMemo(
    () => bookmarks.filter((b) => b.pinned),
    [bookmarks]
  );
  const unpinnedBookmarks = useMemo(
    () => bookmarks.filter((b) => !b.pinned),
    [bookmarks]
  );

  /* 종류별 그룹 */
  const grouped = useMemo(() => {
    const out = {};
    bookmarks.forEach((b) => {
      if (!out[b.kind]) out[b.kind] = [];
      out[b.kind].push(b);
    });
    return out;
  }, [bookmarks]);

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        pinnedBookmarks,
        unpinnedBookmarks,
        grouped,
        loading,
        isBookmarked,
        findBookmark,
        toggleBookmark,
        removeBookmark,
        togglePin,
        refresh: fetchBookmarks,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmark() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmark must be used within BookmarkProvider');
  return ctx;
}