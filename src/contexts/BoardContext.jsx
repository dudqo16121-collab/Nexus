import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { removeMany } from '../lib/nexusFile';

const BoardContext = createContext(null);

const PAGE_SIZE = 20;

export function BoardProvider({ children }) {
  const { user, profile } = useAuth();

  // 데이터
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // 필터/정렬/검색/페이지네이션
  const [category, setCategory] = useState('all');      // 'all' | '공지사항' | '자유게시판' | '기술공유'
  const [sortBy, setSortBy] = useState('latest');       // 'latest' | 'popular' | 'comments' | 'liked'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // 좋아요 (사용자별 localStorage)
  const likedKey = useCallback(
    (postId) => `liked_${user?.id || 'guest'}_${postId}`,
    [user]
  );
  const isLikedByMe = useCallback(
    (postId) => !!localStorage.getItem(likedKey(postId)),
    [likedKey]
  );

  // 조회수 중복 방지
  const viewedKey = useCallback(
    (postId) => `viewed_${user?.id || 'guest'}_${postId}`,
    [user]
  );

  // 대시보드 공지 위젯 전용 — 공지글 우선 3개만 가볍게
const [dashboardNotices, setDashboardNotices] = useState([]);

const fetchDashboardNotices = useCallback(async () => {
  // 공지글 우선, 없으면 최신글로 채워서 3개
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, author_name, created_at, is_notice, category')
    .order('is_notice', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('[Board] fetchDashboardNotices error:', error);
    setDashboardNotices([]);
  } else {
    setDashboardNotices(data || []);
  }
}, []);

  // 목록 가져오기
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('is_notice', { ascending: false })
      .order('created_at', { ascending: false });

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

  // 단일 게시글 가져오기 (조회수 처리 포함)
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

      // 조회수 증가 (사용자별 1회만)
      let newViewCount = data.view_count || 0;
      if (!localStorage.getItem(viewedKey(postId))) {
        newViewCount += 1;
        localStorage.setItem(viewedKey(postId), 'true');
        await supabase
          .from('posts')
          .update({ view_count: newViewCount })
          .eq('id', postId);

        // 로컬 목록도 동기화
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, view_count: newViewCount } : p
          )
        );
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

  // 게시글 생성
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

      setPosts((prev) => [data, ...prev]);
      return data;
    },
    [user, profile]
  );

  // 게시글 수정
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

    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...data } : p)));
    return data;
  }, []);

  // 게시글 삭제
const deletePost = useCallback(
  async (postId) => {
    // 삭제 전 첨부파일 경로 수집
    const post = posts.find((p) => p.id === postId);
    const attachPaths = (post?.attachments || [])
      .map((a) => a.path)
      .filter(Boolean);

    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      console.error('[Board] deletePost error:', error);
      return false;
    }

    // 게시글 삭제 성공 → 첨부파일 Storage 정리
    if (attachPaths.length > 0) {
      await removeMany(attachPaths);
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId));
    return true;
  },
  [posts]
);
  // 좋아요 토글
  const toggleLike = useCallback(
    async (postId) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const liked = isLikedByMe(postId);
      const newLikes = liked ? Math.max(0, post.likes - 1) : post.likes + 1;

      if (liked) localStorage.removeItem(likedKey(postId));
      else localStorage.setItem(likedKey(postId), 'true');

      // 낙관적 업데이트
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: newLikes } : p))
      );

      const { error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', postId);

      if (error) {
        // 롤백
        if (liked) localStorage.setItem(likedKey(postId), 'true');
        else localStorage.removeItem(likedKey(postId));
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: post.likes } : p))
        );
        console.error('[Board] toggleLike error:', error);
      }
    },
    [posts, isLikedByMe, likedKey]
  );

  // 댓글 추가
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

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: updatedComments } : p))
      );
      return true;
    },
    [posts, user, profile]
  );

  // 댓글 삭제
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

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: updatedComments } : p))
      );
      return true;
    },
    [posts]
  );

  // 권한 체크
  const canEdit = useCallback(
    (post) => post && user && (post.user_id === user.id || profile?.is_admin),
    [user, profile]
  );

  // 필터링/정렬/페이지네이션 — derived
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // 카테고리 필터
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }

    // 검색
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q)
      );
    }

    // 정렬 (공지는 항상 최상단)
    const notices = result.filter((p) => p.is_notice);
    const normals = result.filter((p) => !p.is_notice);

    const sortFn = {
      latest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      popular: (a, b) => (b.view_count || 0) - (a.view_count || 0),
      comments: (a, b) => (b.comments?.length || 0) - (a.comments?.length || 0),
      liked: (a, b) => (b.likes || 0) - (a.likes || 0),
    }[sortBy];

    return [...notices.sort(sortFn), ...normals.sort(sortFn)];
  }, [posts, category, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const pagedPosts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, page]);

  // 카테고리별 개수
  const categoryCounts = useMemo(() => {
    return {
      all: posts.length,
      공지사항: posts.filter((p) => p.category === '공지사항').length,
      자유게시판: posts.filter((p) => p.category === '자유게시판').length,
      기술공유: posts.filter((p) => p.category === '기술공유').length,
    };
  }, [posts]);

  // 상단 통계 카드 (전체/오늘/HOT/내 글)
const boardStats = useMemo(() => {
  const todayStr = new Date().toDateString();
  return {
    total: posts.length,
    today: posts.filter(
      (p) => new Date(p.created_at).toDateString() === todayStr
    ).length,
    hot: posts.filter(
      (p) => (p.view_count || 0) >= 100 || (p.likes || 0) >= 10
    ).length,
    mine: posts.filter(
      (p) =>
        (user && p.user_id === user.id) ||
        (profile?.full_name && p.author_name === profile.full_name)
    ).length,
  };
}, [posts, user, profile]);

// HOT 게시글 (가중 점수: 조회수 + 좋아요*5 + 댓글수*3)
const hotPosts = useMemo(() => {
  return posts
    .map((p) => ({
      ...p,
      _score:
        (p.view_count || 0) +
        (p.likes || 0) * 5 +
        (p.comments?.length || 0) * 3,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 6);
}, [posts]);

// 이번 달 작성 랭킹 (상위 5명)
const monthlyRanking = useMemo(() => {
  const now = new Date();
  const thisMonth = posts.filter((p) => {
    const d = new Date(p.created_at);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });
  const counts = {};
  thisMonth.forEach((p) => {
    const name = p.author_name || '익명';
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}, [posts]);

// 최근 댓글 (전체 게시글에서 최신 4개)
const recentComments = useMemo(() => {
  const all = [];
  posts.forEach((p) => {
    (p.comments || []).forEach((c) => {
      all.push({
        text: c.text || c.content || '',
        author: c.author_name || c.author || '익명',
        postId: p.id,
        postTitle: p.title,
        createdAt: c.time || c.created_at || p.created_at,
      });
    });
  });
  return all
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);
}, [posts]);

  return (
    <BoardContext.Provider
      value={{
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
        boardStats,        // ⭐ 추가
        hotPosts,          // ⭐ 추가
        monthlyRanking,    // ⭐ 추가
        recentComments,    // ⭐ 추가
        dashboardNotices,         // ⭐ 추가
        fetchDashboardNotices,    // ⭐ 추가
        
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
        setCategory: (c) => {
          setCategory(c);
          setPage(1);
        },
        setSortBy: (s) => {
          setSortBy(s);
          setPage(1);
        },
        setSearch: (s) => {
          setSearch(s);
          setPage(1);
        },
        setPage,
        // 유틸
        canEdit,
        isLikedByMe,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used within BoardProvider');
  return ctx;
}