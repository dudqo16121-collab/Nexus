// WikiContext.jsx 전체 교체

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const WikiContext = createContext(null);

export function WikiProvider({ children }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* 검색 상태 */
  const [searchQuery, setSearchQuery] = useState('');
  /* 카테고리 접기 상태 */
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  /* 태그 필터 (단일 태그 클릭 시 활성) */
  const [activeTag, setActiveTag] = useState(null);

  /* 문서 목록 (제목/메타/카테고리/태그) */
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wiki_documents')
      .select('id, title, author_id, author_name, category, tags, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Wiki] fetchDocuments error:', error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }, []);

  /* 본문 포함 단일 조회 */
  const selectDocument = useCallback(async (id) => {
    if (!id) {
      setCurrentDoc(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('wiki_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Wiki] selectDocument error:', error);
    } else {
      setCurrentDoc(data);
    }
    setLoading(false);
  }, []);
// WikiContext.jsx 의 다른 useCallback 들 사이에 추가

/* 리비전 목록 조회 */
const fetchRevisions = useCallback(async (documentId) => {
  if (!documentId) return [];
  const { data, error } = await supabase
    .from('wiki_revisions')
    .select('id, revision_no, title, change_type, changed_by_name, created_at')
    .eq('document_id', documentId)
    .order('revision_no', { ascending: false });
  if (error) {
    console.error('[Wiki] fetchRevisions error:', error);
    return [];
  }
  return data || [];
}, []);

/* 특정 리비전의 전체 내용 조회 (content 포함) */
const fetchRevisionDetail = useCallback(async (revisionId) => {
  if (!revisionId) return null;
  const { data, error } = await supabase
    .from('wiki_revisions')
    .select('*')
    .eq('id', revisionId)
    .single();
  if (error) {
    console.error('[Wiki] fetchRevisionDetail error:', error);
    return null;
  }
  return data;
}, []);

/* 리비전으로 복원 */
const restoreRevision = useCallback(async (revisionId) => {
  const { data, error } = await supabase.rpc('restore_wiki_revision', {
    p_revision_id: revisionId,
  });
  if (error) {
    console.error('[Wiki] restoreRevision error:', error);
    return { ok: false, error: error.message };
  }
  /* 복원 후 현재 문서 새로고침 */
  if (currentDoc?.id === data) {
    selectDocument(data);
  }
  /* 문서 목록도 동기화 */
  fetchDocuments();
  return { ok: true, documentId: data };
}, [currentDoc, selectDocument, fetchDocuments]);

  /* 새 문서 — 카테고리 기본값 */
const createDocument = useCallback(async (templateOrCategory = '기타') => {
  if (!user) return null;

  /* 객체로 들어오면 템플릿, 문자열이면 카테고리 */
  const isTemplate = typeof templateOrCategory === 'object' && templateOrCategory !== null;
  const tpl = isTemplate ? templateOrCategory : null;

  const newDoc = {
    title: tpl?.title || '새 문서',
    content: tpl?.content || '',
    category: tpl?.category || (isTemplate ? '기타' : templateOrCategory),
    tags: tpl?.tags || [],
    author_id: user.id,
    author_name: user.user_metadata?.name || user.email?.split('@')[0] || '익명',
  };

  const { data, error } = await supabase
    .from('wiki_documents')
    .insert(newDoc)
    .select()
    .single();

  if (error) {
    console.error('[Wiki] createDocument error:', error);
    return null;
  }

  setDocuments((prev) => [data, ...prev]);
  setCurrentDoc(data);
  return data;
}, [user]);

  /* 업데이트 — category/tags 도 갱신 가능 */
  const updateDocument = useCallback(async (id, updates) => {
    setSaving(true);
    const { data, error } = await supabase
      .from('wiki_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error('[Wiki] updateDocument error:', error);
      return false;
    }

    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...data } : d))
    );
    setCurrentDoc((prev) => (prev?.id === id ? data : prev));
    return true;
  }, []);
const fetchBacklinks = useCallback(async (documentId) => {
  if (!documentId) return [];
  try {
    const { data, error } = await supabase.rpc('get_wiki_backlinks', {
      p_document_id: documentId,
    });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('[Wiki] fetchBacklinks:', e);
    return [];
  }
}, []);
  /* 삭제 */
  const deleteDocument = useCallback(async (id) => {
    const { error } = await supabase
      .from('wiki_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Wiki] deleteDocument error:', error);
      return false;
    }

    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setCurrentDoc((prev) => (prev?.id === id ? null : prev));
    return true;
  }, []);

  /* 편집 가능 여부 */
  const canEdit = useCallback(
    (doc) => doc && user && doc.author_id === user.id,
    [user]
  );

  /* ── 검색 + 태그 필터링된 문서 ── */
  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((d) => {
      /* 검색어 매칭 (제목만 — 본문은 list 호출 시 select 안 함) */
      if (q && !d.title?.toLowerCase().includes(q)) {
        /* 제목 미스매치면 태그도 체크 */
        const tagMatch = (d.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!tagMatch) return false;
      }
      /* 태그 필터 */
      if (activeTag) {
        if (!(d.tags || []).includes(activeTag)) return false;
      }
      return true;
    });
  }, [documents, searchQuery, activeTag]);

  /* ── 카테고리별 그룹핑 ── */
  const documentsByCategory = useMemo(() => {
    const groups = {};
    filteredDocuments.forEach((d) => {
      const cat = d.category || '기타';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    });
    return groups;
  }, [filteredDocuments]);

  /* ── 전체 태그 클라우드 (빈도순) ── */
  const allTags = useMemo(() => {
    const counter = new Map();
    documents.forEach((d) => {
      (d.tags || []).forEach((t) => {
        counter.set(t, (counter.get(t) || 0) + 1);
      });
    });
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [documents]);

  /* 카테고리 접기 토글 */
  const toggleCategoryCollapsed = useCallback((cat) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  return (
    <WikiContext.Provider
      value={{
        documents,
        filteredDocuments,
        documentsByCategory,
        allTags,
        currentDoc,
        loading,
        saving,
        searchQuery,
        fetchBacklinks,
        setSearchQuery,
        activeTag,
        setActiveTag,
        collapsedCategories,
        toggleCategoryCollapsed,
        fetchDocuments,
        fetchRevisions,
        fetchRevisionDetail,
        restoreRevision,
        selectDocument,
        createDocument,
        updateDocument,
        deleteDocument,
        canEdit,
      }}
    >
      {children}
    </WikiContext.Provider>
  );
}

export function useWiki() {
  const ctx = useContext(WikiContext);
  if (!ctx) throw new Error('useWiki must be used within WikiProvider');
  return ctx;
}