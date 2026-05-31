// contexts/BoardContext.jsx
// 게시판 데이터 로직 — 성능 최적화 버전.
// 변경점:
//  - mountedRef + safeSet 으로 unmount 후 setState 방지
//  - boardStats / hotPosts / monthlyRanking / recentComments 통합 계산 (1패스)
//  - categoryCounts 1패스 계산
//  - Provider value useMemo 로 안정화

import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { removeMany } from '../lib/nexusFile';

const BoardContext = createContext(null);

const PAGE_SIZE = 20;

export function BoardProvider({ children }) {
  const { user, profile } = useAuth();

  /* unmount 가드 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* 데이터 */
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardNotices, setDashboardNotices] = useState([]);

  /* 필터/정렬/검색/페이지네이션 */
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  /* 좋아요/조회수 키 (사용자별 localStorage) */
  const likedKey = useCallback(
    (postId) => `liked_${user?.id || 'guest'}_${postId}`,
    [user]
  );
  const isLikedByMe = useCallback(
    (postId) => !!localStorage.getItem(likedKey(postId)),
    [likedKey]
  );
  const viewedKey = useCallback(
    (postId) => `viewed_${user?.id || 'guest'}_${postId}`,
    [user]
  );

  /* 대시보드 공지 위젯 전용 */
  const fetchDashboardNotices = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, author_name, created_at, is_notice, category')
      .order('is_notice', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3);

    if (!mountedRef.current) return;
    if (error) {
      console.error('[Board] fetchDashboardNotices error:', error);
      setDashboardNotices([]);
    } else {
      setDashboardNotices(data || []);
    }
  }, []);

  /* 목록 가져오기 */
  const fetchPosts = useCallback(async () => {
    if (mountedRef.current) setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('is_notice', { ascending: false })
      .order('created_at', { ascending: false });

    if (!mountedRef.current) return;

    if (error) {
      console.error('[Board] fetchPosts error:', error);
      setPosts([]);
    } else {
      setPosts(
        (data || []).map((p) => ({
          ...p,
          likes: p.likes || 0,
          comments: p.comments || [],
          attachments: p.attachments || [],
          category: p.category || '자유게시판',
        }))
      );
    }
    setLoading(false);
  }, []);

  /* 단일 게시글 — 조회수 처리 포함 */
  const fetchPost = useCallback(
    async (postId) => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) {
        console.error('[Board] fetchPost error:', error);
        return null;
      }

      let newViewCount = data.view_count || 0;
      if (!localStorage.getItem(viewedKey(postId))) {
        newViewCount += 1;
        localStorage.setItem(viewedKey(postId), 'true');
        await supabase
          .from('posts')
          .update({ view_count: newViewCount })
          .eq('id', postId);

        if (mountedRef.current) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, view_count: newViewCount } : p))
          );
        }
      }

      return {
        ...data,
        view_count: newViewCount,
        likes: data.likes || 0,
        comments: data.comments || [],
        attachments: data.attachments || [],
      };
    },
    [viewedKey]
  );

  /* 게시글 생성 */
  const createPost = useCallback(
    async ({ title, content, is_notice, category, attachments = [] }) => {
      if (!user) return null;

      const newPost = {
        title: title.trim(),
        content,
        is_notice: !!is_notice,
        category: category || '자유게시판',
        author_name: profile?.full_name || user.email?.split('@')[0] || '익명',
        user_id: user.id,
        likes: 0,
        view_count: 0,
        comments: [],
        attachments,
      };

      const { data, error } = await supabase
        .from('posts')
        .insert(newPost)
        .select()
        .single();

      if (error) {
        console.error('[Board] createPost error:', error);
        return null;
      }

      if (mountedRef.current) setPosts((prev) => [data, ...prev]);
      return data;
    },
    [user, profile]
  );

  /* 게시글 수정 */
  const updatePost = useCallback(async (postId, updates) => {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      console.error('[Board] updatePost error:', error);
      return null;
    }

    if (mountedRef.current) {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...data } : p)));
    }
    return data;
  }, []);

  /* 게시글 삭제 */
  const deletePost = useCallback(
    async (postId) => {
      const post = posts.find((p) => p.id === postId);
      const attachPaths = (post?.attachments || [])
        .map((a) => a.path)
        .filter(Boolean);

      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) {
        console.error('[Board] deletePost error:', error);
        return false;
      }

      if (attachPaths.length > 0) {
        await removeMany(attachPaths);
      }

      if (mountedRef.current) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
      return true;
    },
    [posts]
  );

  /* 좋아요 토글 — 낙관적 업데이트 */
  const toggleLike = useCallback(
    async (postId) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const liked = isLikedByMe(postId);
      const newLikes = liked ? Math.max(0, post.likes - 1) : post.likes + 1;

      if (liked) localStorage.removeItem(likedKey(postId));
      else localStorage.setItem(likedKey(postId), 'true');

      if (mountedRef.current) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: newLikes } : p))
        );
      }

      const { error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', postId);

      if (error) {
        // 롤백
        if (liked) localStorage.setItem(likedKey(postId), 'true');
        else localStorage.removeItem(likedKey(postId));
        if (mountedRef.current) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, likes: post.likes } : p))
          );
        }
        console.error('[Board] toggleLike error:', error);
      }
    },
    [posts, isLikedByMe, likedKey]
  );

  /* 댓글 추가 */
  const addComment = useCallback(
    async (postId, text) => {
      if (!text.trim() || !user) return false;
      const post = posts.find((p) => p.id === postId);
      if (!post) return false;

      const newComment = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        author: profile?.full_name || user.email?.split('@')[0] || '익명',
        author_id: user.id,
        text: text.trim(),
        time: new Date().toISOString(),
      };

      const updatedComments = [...(post.comments || []), newComment];

      const { error } = await supabase
        .from('posts')
        .update({ comments: updatedComments })
        .eq('id', postId);

      if (error) {
        console.error('[Board] addComment error:', error);
        return false;
      }

      if (mountedRef.current) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments: updatedComments } : p))
        );
      }
      return true;
    },
    [posts, user, profile]
  );

  /* 댓글 삭제 */
  const deleteComment = useCallback(
    async (postId, commentId) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return false;

      const updatedComments = (post.comments || []).filter((c) => c.id !== commentId);

      const { error } = await supabase
        .from('posts')
        .update({ comments: updatedComments })
        .eq('id', postId);

      if (error) {
        console.error('[Board] deleteComment error:', error);
        return false;
      }

      if (mountedRef.current) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments: updatedComments } : p))
        );
      }
      return true;
    },
    [posts]
  );

  /* 권한 체크 */
  const canEdit = useCallback(
    (post) => post && user && (post.user_id === user.id || profile?.is_admin),
    [user, profile]
  );

  /* ─── 필터링된 목록 ─── */
  const filteredPosts = useMemo(() => {
    let result = posts;

    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q)
      );
    }

    /* 공지 우선 + 정렬 */
    const notices = [];
    const normals = [];
    for (const p of result) {
      if (p.is_notice) notices.push(p);
      else normals.push(p);
    }

    const sortFn = {
      latest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      popular: (a, b) => (b.view_count || 0) - (a.view_count || 0),
      comments: (a, b) => (b.comments?.length || 0) - (a.comments?.length || 0),
      liked: (a, b) => (b.likes || 0) - (a.likes || 0),
    }[sortBy];

    return [...notices.sort(sortFn), ...normals.sort(sortFn)];
  }, [posts, category, search, sortBy]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE)),
    [filteredPosts]
  );

  const pagedPosts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, page]);

  /* ─── 통합 통계 — 1패스로 계산 ─── */
  const aggregateStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();

    /* 카테고리 카운트 */
    const categoryCounts = {
      all: posts.length,
      공지사항: 0,
      자유게시판: 0,
      기술공유: 0,
    };

    /* 보드 통계 */
    let todayCount = 0;
    let hotCount = 0;
    let mineCount = 0;

    /* 이달의 작성 랭킹용 */
    const monthlyCounts = {};

    /* HOT 점수 + recentComments 누적 */
    const scored = new Array(posts.length);
    const allComments = [];

    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];

      /* 카테고리 카운트 */
      if (p.category && categoryCounts[p.category] !== undefined) {
        categoryCounts[p.category]++;
      }

      /* 오늘 작성 */
      if (new Date(p.created_at).toDateString() === todayStr) {
        todayCount++;
      }

      /* HOT (view≥100 or likes≥10) */
      const views = p.view_count || 0;
      const likes = p.likes || 0;
      const commentsCount = p.comments?.length || 0;
      if (views >= 100 || likes >= 10) hotCount++;

      /* 내 글 */
      if (
        (user && p.user_id === user.id) ||
        (profile?.full_name && p.author_name === profile.full_name)
      ) {
        mineCount++;
      }

      /* HOT 점수 계산 (가중치) */
      scored[i] = {
        ...p,
        _score: views + likes * 5 + commentsCount * 3,
      };

      /* 이달의 작성 랭킹 */
      const d = new Date(p.created_at);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
        const name = p.author_name || '익명';
        monthlyCounts[name] = (monthlyCounts[name] || 0) + 1;
      }

      /* 최근 댓글 누적 */
      const comments = p.comments || [];
      for (let j = 0; j < comments.length; j++) {
        const c = comments[j];
        allComments.push({
          text: c.text || c.content || '',
          author: c.author_name || c.author || '익명',
          postId: p.id,
          postTitle: p.title,
          createdAt: c.time || c.created_at || p.created_at,
        });
      }
    }

    /* HOT 정렬 + 상위 6개 */
    const hotPosts = scored
      .sort((a, b) => b._score - a._score)
      .slice(0, 6);

    /* 월별 랭킹 상위 5명 */
    const monthlyRanking = Object.entries(monthlyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    /* 최근 댓글 4개 */
    const recentComments = allComments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);

    return {
      categoryCounts,
      boardStats: {
        total: posts.length,
        today: todayCount,
        hot: hotCount,
        mine: mineCount,
      },
      hotPosts,
      monthlyRanking,
      recentComments,
    };
  }, [posts, user, profile]);

  const categoryCounts = aggregateStats.categoryCounts;
  const boardStats = aggregateStats.boardStats;
  const hotPosts = aggregateStats.hotPosts;
  const monthlyRanking = aggregateStats.monthlyRanking;
  const recentComments = aggregateStats.recentComments;

  /* 필터 setter — 페이지 초기화 자동 */
  const setCategoryWithReset = useCallback((c) => {
    setCategory(c);
    setPage(1);
  }, []);
  const setSortByWithReset = useCallback((s) => {
    setSortBy(s);
    setPage(1);
  }, []);
  const setSearchWithReset = useCallback((s) => {
    setSearch(s);
    setPage(1);
  }, []);

  /* ─── Provider value 메모이즈 ─── */
  const value = useMemo(() => ({
    // 상태
    posts: pagedPosts,
    allPosts: posts,
    filteredPosts,
    loading,
    category,
    sortBy,
    search,
    page,
    totalPages,
    categoryCounts,
    boardStats,
    hotPosts,
    monthlyRanking,
    recentComments,
    dashboardNotices,
    fetchDashboardNotices,
    // 액션
    fetchPosts,
    fetchPost,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    addComment,
    deleteComment,
    // 필터 setter
    setCategory: setCategoryWithReset,
    setSortBy: setSortByWithReset,
    setSearch: setSearchWithReset,
    setPage,
    // 유틸
    canEdit,
    isLikedByMe,
  }), [
    pagedPosts, posts, filteredPosts, loading,
    category, sortBy, search, page, totalPages,
    categoryCounts, boardStats, hotPosts, monthlyRanking, recentComments,
    dashboardNotices, fetchDashboardNotices,
    fetchPosts, fetchPost,
    createPost, updatePost, deletePost,
    toggleLike, addComment, deleteComment,
    setCategoryWithReset, setSortByWithReset, setSearchWithReset,
    canEdit, isLikedByMe,
  ]);

  return (
    <BoardContext.Provider value={value}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within BoardProvider');
  return ctx;
}