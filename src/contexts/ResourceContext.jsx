// contexts/ResourceContext.jsx
// 자료실 — 카테고리/공유/즐겨찾기/조회기록 + 폴리시 기반 보기.

import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, useMemo,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { uploadMany, remove, getPublicUrl } from '../lib/nexusFile';

const ResourceContext = createContext(null);

const RESOURCE_FOLDER = 'resource';

export const VISIBILITY_LABELS = {
  public:     { label: '전체 공개', icon: 'fa-globe',   color: '#06d6a0' },
  restricted: { label: '제한 공유', icon: 'fa-user-lock', color: '#f59e0b' },
};

export function ResourceProvider({ children }) {
  const { user } = useAuth();

  /* unmount 가드 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* state */
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shares, setShares] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [viewHistory, setViewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  /* UI 상태 */
  const [keyword, setKeyword] = useState('');
  const [activeView, setActiveView] = useState('all'); 
  // 'all' | 'recent' | 'favorites' | 'mine' | 'shared' | category-id
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  /* 모달 */
  const [detailModal, setDetailModal] = useState({ open: false, resource: null });
  const [uploadModal, setUploadModal] = useState({ open: false });

  /* ─── fetch 함수들 ─── */
  const fetchCategories = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('resource_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!mountedRef.current) return;
    if (err) {
      console.error('[Resource] fetchCategories:', err);
      setCategories([]);
    } else {
      setCategories(data || []);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    if (!mountedRef.current) return;
    if (err) {
      console.error('[Resource] fetchResources:', err);
      setResources([]);
      setError(err.message);
    } else {
      setResources(data || []);
      setError(null);
    }
  }, []);

  const fetchShares = useCallback(async () => {
    if (!user) {
      if (mountedRef.current) setShares([]);
      return;
    }
    const { data, error: err } = await supabase
      .from('resource_shares')
      .select('*');
    if (!mountedRef.current) return;
    if (err) {
      console.error('[Resource] fetchShares:', err);
      setShares([]);
    } else {
      setShares(data || []);
    }
  }, [user]);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      if (mountedRef.current) setFavorites([]);
      return;
    }
    const { data, error: err } = await supabase
      .from('resource_favorites')
      .select('*')
      .eq('user_id', user.id);
    if (!mountedRef.current) return;
    if (err) {
      console.error('[Resource] fetchFavorites:', err);
      setFavorites([]);
    } else {
      setFavorites(data || []);
    }
  }, [user]);

  const fetchViewHistory = useCallback(async () => {
    if (!user) {
      if (mountedRef.current) setViewHistory([]);
      return;
    }
    const { data, error: err } = await supabase
      .from('resource_view_history')
      .select('*')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(50);
    if (!mountedRef.current) return;
    if (err) {
      console.error('[Resource] fetchViewHistory:', err);
      setViewHistory([]);
    } else {
      setViewHistory(data || []);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (mountedRef.current) setLoading(true);
    await Promise.all([
      fetchCategories(),
      fetchResources(),
      fetchShares(),
      fetchFavorites(),
      fetchViewHistory(),
    ]);
    if (mountedRef.current) setLoading(false);
  }, [fetchCategories, fetchResources, fetchShares, fetchFavorites, fetchViewHistory]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ─── 파일 업로드 ─── */
  const uploadFiles = useCallback(async (fileList, options = {}) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    const files = Array.from(fileList || []);
    if (files.length === 0) return { ok: false, error: '파일이 없습니다.' };

    if (mountedRef.current) setUploading(true);
    try {
      const uploaded = await uploadMany(files, RESOURCE_FOLDER);
      if (uploaded.length === 0) {
        throw new Error('업로드된 파일이 없습니다.');
      }

      const rows = uploaded.map((f) => ({
        file_name: f.name,
        file_size: f.size,
        file_url: getPublicUrl(f.path),
        storage_path: f.path,
        user_id: user.id,
        category_id: options.categoryId || null,
        description: options.description || null,
        visibility: options.visibility || 'public',
      }));

      const { data: inserted, error: dbErr } = await supabase
        .from('resources')
        .insert(rows)
        .select();
      if (dbErr) throw dbErr;

      /* 공유 대상 추가 */
      if (options.visibility === 'restricted' && options.shareWith?.length > 0 && inserted) {
        const shareRows = [];
        for (const res of inserted) {
          for (const uid of options.shareWith) {
            if (uid !== user.id) {
              shareRows.push({
                resource_id: res.id,
                shared_with_id: uid,
                shared_by_id: user.id,
              });
            }
          }
        }
        if (shareRows.length > 0) {
          await supabase.from('resource_shares').insert(shareRows);
        }
      }

      await refresh();
      return { ok: true, count: uploaded.length };
    } catch (err) {
      console.error('[Resource] uploadFiles:', err);
      return { ok: false, error: err.message || '업로드 실패' };
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  }, [user, refresh]);

  /* ─── 파일 메타 수정 ─── */
  const updateResource = useCallback(async (id, updates) => {
    const { error: err } = await supabase
      .from('resources')
      .update(updates)
      .eq('id', id);
    if (err) {
      console.error('[Resource] updateResource:', err);
      return { ok: false, error: err.message };
    }
    if (mountedRef.current) {
      setResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    }
    return { ok: true };
  }, []);

  /* ─── 파일 삭제 ─── */
  const deleteResource = useCallback(async (id) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    try {
      const target = resources.find((r) => r.id === id);
      if (target?.storage_path) {
        await remove(target.storage_path);
      }
      const { error: err } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
      if (err) throw err;
      if (mountedRef.current) {
        setResources((prev) => prev.filter((r) => r.id !== id));
      }
      return { ok: true };
    } catch (err) {
      console.error('[Resource] deleteResource:', err);
      return { ok: false, error: err.message };
    }
  }, [user, resources]);

  /* ─── 공유 추가/제거 ─── */
  const addShares = useCallback(async (resourceId, userIds) => {
    if (!user) return { ok: false };
    const rows = userIds
      .filter((uid) => uid !== user.id)
      .map((uid) => ({
        resource_id: resourceId,
        shared_with_id: uid,
        shared_by_id: user.id,
      }));
    if (rows.length === 0) return { ok: true };
    try {
      const { data, error: err } = await supabase
        .from('resource_shares')
        .insert(rows)
        .select();
      if (err) throw err;
      if (mountedRef.current && data) {
        setShares((prev) => [...prev, ...data]);
      }
      return { ok: true };
    } catch (err) {
      if (err.code === '23505') return { ok: true }; // unique 중복 무시
      console.error('[Resource] addShares:', err);
      return { ok: false, error: err.message };
    }
  }, [user]);

  const removeShare = useCallback(async (resourceId, sharedWithId) => {
    const { error: err } = await supabase
      .from('resource_shares')
      .delete()
      .eq('resource_id', resourceId)
      .eq('shared_with_id', sharedWithId);
    if (err) return { ok: false, error: err.message };
    if (mountedRef.current) {
      setShares((prev) =>
        prev.filter(
          (s) => !(s.resource_id === resourceId && s.shared_with_id === sharedWithId)
        )
      );
    }
    return { ok: true };
  }, []);

  /* ─── 즐겨찾기 토글 ─── */
  const toggleFavorite = useCallback(async (resourceId) => {
    if (!user) return { ok: false };
    const existing = favorites.find((f) => f.resource_id === resourceId);
    try {
      if (existing) {
        const { error: err } = await supabase
          .from('resource_favorites')
          .delete()
          .eq('id', existing.id);
        if (err) throw err;
        if (mountedRef.current) {
          setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        }
      } else {
        const { data, error: err } = await supabase
          .from('resource_favorites')
          .insert([{ resource_id: resourceId, user_id: user.id }])
          .select()
          .single();
        if (err) throw err;
        if (mountedRef.current) {
          setFavorites((prev) => [data, ...prev]);
        }
      }
      return { ok: true };
    } catch (err) {
      console.error('[Resource] toggleFavorite:', err);
      return { ok: false, error: err.message };
    }
  }, [user, favorites]);

  /* ─── 조회 기록 ─── */
  const recordView = useCallback(async (resourceId, action = 'view') => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('resource_view_history')
        .insert([{ resource_id: resourceId, user_id: user.id, action }])
        .select()
        .single();
      if (mountedRef.current && data) {
        setViewHistory((prev) => [data, ...prev].slice(0, 50));
      }
      /* 카운트 증가 (실패해도 무시) */
      if (action === 'download') {
        await supabase.rpc('increment_resource_download', { p_resource_id: resourceId }).catch(() => {});
        /* RPC 없으면 직접 update */
        const target = resources.find((r) => r.id === resourceId);
        if (target) {
          await supabase
            .from('resources')
            .update({ download_count: (target.download_count || 0) + 1 })
            .eq('id', resourceId);
        }
      } else {
        const target = resources.find((r) => r.id === resourceId);
        if (target) {
          await supabase
            .from('resources')
            .update({ view_count: (target.view_count || 0) + 1 })
            .eq('id', resourceId);
        }
      }
    } catch (e) {
      console.warn('[Resource] recordView:', e);
    }
  }, [user, resources]);

  /* ─── 헬퍼 ─── */
  const isFavorite = useCallback(
    (resourceId) => favorites.some((f) => f.resource_id === resourceId),
    [favorites]
  );

  const sharesForResource = useCallback(
    (resourceId) => shares.filter((s) => s.resource_id === resourceId),
    [shares]
  );

  const canEdit = useCallback(
    (resource) => user && resource?.user_id === user.id,
    [user]
  );

  /* ─── 필터링된 리스트 ─── */
  const filteredResources = useMemo(() => {
    let list = [...resources];

    /* activeView 적용 */
    if (activeView === 'recent') {
      const recentIds = [...new Set(viewHistory.map((h) => h.resource_id))];
      list = list
        .filter((r) => recentIds.includes(r.id))
        .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
    } else if (activeView === 'favorites') {
      const favIds = new Set(favorites.map((f) => f.resource_id));
      list = list.filter((r) => favIds.has(r.id));
    } else if (activeView === 'mine') {
      list = list.filter((r) => r.user_id === user?.id);
    } else if (activeView === 'shared') {
      /* 나에게 공유된 파일 (본인 파일 제외) */
      const sharedIds = new Set(
        shares.filter((s) => s.shared_with_id === user?.id).map((s) => s.resource_id)
      );
      list = list.filter((r) => sharedIds.has(r.id) && r.user_id !== user?.id);
    } else if (activeView !== 'all') {
      /* 카테고리 ID */
      list = list.filter((r) => r.category_id === activeView);
    }

    /* 검색어 */
    if (keyword.trim()) {
      const q = keyword.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.file_name || '').toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [resources, activeView, viewHistory, favorites, shares, keyword, user]);

  /* 카테고리별 카운트 (사이드바 배지용) */
  const categoryCounts = useMemo(() => {
    const map = {};
    for (const r of resources) {
      if (r.category_id) {
        map[r.category_id] = (map[r.category_id] || 0) + 1;
      }
    }
    return map;
  }, [resources]);

  /* 사이드바 카운트 */
  const sidebarCounts = useMemo(() => {
    const recentIds = new Set(viewHistory.map((h) => h.resource_id));
    const sharedToMe = shares.filter((s) => s.shared_with_id === user?.id);
    return {
      all: resources.length,
      recent: recentIds.size,
      favorites: favorites.length,
      mine: resources.filter((r) => r.user_id === user?.id).length,
      shared: sharedToMe.length,
    };
  }, [resources, viewHistory, favorites, shares, user]);

  /* ─── Provider value ─── */
  const value = useMemo(() => ({
    /* 데이터 */
    resources,
    filteredResources,
    categories,
    shares,
    favorites,
    viewHistory,
    loading,
    error,
    uploading,
    /* UI 상태 */
    keyword, setKeyword,
    activeView, setActiveView,
    viewMode, setViewMode,
    categoryCounts,
    sidebarCounts,
    /* 액션 */
    refresh,
    uploadFiles,
    updateResource,
    deleteResource,
    addShares,
    removeShare,
    toggleFavorite,
    recordView,
    /* 헬퍼 */
    isFavorite,
    sharesForResource,
    canEdit,
    /* 모달 */
    detailModal,
    openDetail: (resource) => setDetailModal({ open: true, resource }),
    closeDetail: () => setDetailModal({ open: false, resource: null }),
    uploadModal,
    openUploadModal: () => setUploadModal({ open: true }),
    closeUploadModal: () => setUploadModal({ open: false }),
  }), [
    resources, filteredResources, categories, shares, favorites, viewHistory,
    loading, error, uploading,
    keyword, activeView, viewMode,
    categoryCounts, sidebarCounts,
    refresh, uploadFiles, updateResource, deleteResource,
    addShares, removeShare, toggleFavorite, recordView,
    isFavorite, sharesForResource, canEdit,
    detailModal, uploadModal,
  ]);

  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  );
}

export function useResource() {
  const ctx = useContext(ResourceContext);
  if (!ctx) throw new Error('useResource must be used within ResourceProvider');
  return ctx;
}