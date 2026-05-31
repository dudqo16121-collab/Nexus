// contexts/IdeaContext.jsx
// 아이디어 보드 — 부서별 카드 누적, 반응/댓글, 위키 승격.

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useWiki } from './WikiContext';

const IdeaContext = createContext(null);

export const IDEA_CATEGORIES = [
  { value: 'idea',  label: '아이디어', icon: 'fa-lightbulb',           color: '#f59e0b' },
  { value: 'todo',  label: 'TODO',     icon: 'fa-list-check',          color: '#4361ee' },
  { value: 'issue', label: '문제점',   icon: 'fa-triangle-exclamation', color: '#ef4444' },
  { value: 'retro', label: '회고',     icon: 'fa-rotate-left',         color: '#06d6a0' },
];

export const REACTIONS = [
  { value: 'like',     emoji: '👍', label: '좋아요' },
  { value: 'idea',     emoji: '💡', label: '좋은 아이디어' },
  { value: 'question', emoji: '❓', label: '궁금해요' },
];

export function IdeaProvider({ children }) {
  const { user, profile } = useAuth();

  /* WikiContext가 없을 수도 있으니 안전하게 가져오기 */
  let createDocument = null;
  try {
    const wiki = useWiki();
    createDocument = wiki?.createDocument;
  } catch {
    createDocument = null;
  }

  const [cards, setCards] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null);

  const myDept = profile?.department || '';

  /* 로드 */
  const fetchAll = useCallback(async () => {
    if (!myDept) {
      setCards([]);
      setReactions([]);
      setComments([]);
      return;
    }
    setLoading(true);
    try {
      const { data: cData, error: cErr } = await supabase
        .from('idea_cards')
        .select('*')
        .eq('department', myDept)
        .order('created_at', { ascending: false });
      if (cErr) throw cErr;

      const ids = (cData || []).map((c) => c.id);
      let rData = [], coData = [];
      if (ids.length > 0) {
        const [rRes, coRes] = await Promise.all([
          supabase.from('idea_reactions').select('*').in('card_id', ids),
          supabase.from('idea_comments').select('*').in('card_id', ids).order('created_at', { ascending: true }),
        ]);
        if (rRes.error) throw rRes.error;
        if (coRes.error) throw coRes.error;
        rData = rRes.data || [];
        coData = coRes.data || [];
      }

      setCards(cData || []);
      setReactions(rData);
      setComments(coData);
    } catch (e) {
      console.error('[Idea] fetchAll:', e);
      setCards([]);
      setReactions([]);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [myDept]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  /* 카테고리별 분류 */
  const cardsByCategory = useMemo(() => {
    const out = { idea: [], todo: [], issue: [], retro: [] };
    cards.forEach((c) => {
      if (out[c.category]) out[c.category].push(c);
    });
    return out;
  }, [cards]);

  /* 카드별 반응 집계 */
  const reactionsOf = useCallback(
    (cardId) => {
      const list = reactions.filter((r) => r.card_id === cardId);
      const counts = {};
      const mine = new Set();
      for (const r of list) {
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;
        if (r.user_id === user?.id) mine.add(r.reaction);
      }
      return { counts, mine };
    },
    [reactions, user]
  );

  /* 카드별 댓글 */
  const commentsOf = useCallback(
    (cardId) => comments.filter((c) => c.card_id === cardId),
    [comments]
  );

  /* 카드 생성 */
  const createCard = useCallback(
    async ({ category, title, content }) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      if (!myDept) return { ok: false, error: '부서 정보가 없어 카드를 만들 수 없어요.' };
      if (!title.trim()) return { ok: false, error: '제목을 입력해주세요.' };

      const payload = {
        department: myDept,
        author_id: user.id,
        author_name: profile?.full_name || '동료',
        category: category || 'idea',
        title: title.trim(),
        content: (content || '').trim(),
        status: 'open',
      };

      try {
        const { data, error } = await supabase
          .from('idea_cards')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        setCards((prev) => [data, ...prev]);
        return { ok: true, card: data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, profile, myDept]
  );

  /* 카드 수정 */
  const updateCard = useCallback(
    async (cardId, updates) => {
      if (!user) return { ok: false };
      try {
        const { data, error } = await supabase
          .from('idea_cards')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', cardId)
          .eq('author_id', user.id)
          .select()
          .single();
        if (error) throw error;
        setCards((prev) => prev.map((c) => (c.id === cardId ? data : c)));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  /* 카드 삭제 */
  const deleteCard = useCallback(
    async (cardId) => {
      if (!user) return { ok: false };
      try {
        const { error } = await supabase
          .from('idea_cards')
          .delete()
          .eq('id', cardId)
          .eq('author_id', user.id);
        if (error) throw error;
        setCards((prev) => prev.filter((c) => c.id !== cardId));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  /* 반응 토글 */
  const toggleReaction = useCallback(
    async (cardId, reaction) => {
      if (!user) return { ok: false };
      const existing = reactions.find(
        (r) => r.card_id === cardId && r.user_id === user.id && r.reaction === reaction
      );
      try {
        if (existing) {
          const { error } = await supabase
            .from('idea_reactions')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
          setReactions((prev) => prev.filter((r) => r.id !== existing.id));
        } else {
          const { data, error } = await supabase
            .from('idea_reactions')
            .insert([{ card_id: cardId, user_id: user.id, reaction }])
            .select()
            .single();
          if (error) throw error;
          setReactions((prev) => [...prev, data]);
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, reactions]
  );

  /* 댓글 추가 */
  const addComment = useCallback(
    async (cardId, content) => {
      if (!user) return { ok: false };
      if (!content.trim()) return { ok: false, error: '내용을 입력해주세요.' };
      try {
        const { data, error } = await supabase
          .from('idea_comments')
          .insert([{
            card_id: cardId,
            author_id: user.id,
            author_name: profile?.full_name || '동료',
            content: content.trim(),
          }])
          .select()
          .single();
        if (error) throw error;
        setComments((prev) => [...prev, data]);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, profile]
  );

  /* 댓글 삭제 */
  const deleteComment = useCallback(
    async (commentId) => {
      if (!user) return { ok: false };
      try {
        const { error } = await supabase
          .from('idea_comments')
          .delete()
          .eq('id', commentId)
          .eq('author_id', user.id);
        if (error) throw error;
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user]
  );

  /* 위키 승격 — 카드 + 댓글을 위키 문서로 변환 */
  const promoteToWiki = useCallback(
    async (cardId) => {
      if (!user) return { ok: false };
      if (!createDocument) {
        return { ok: false, error: '위키 컨텍스트를 사용할 수 없어요.' };
      }
      const card = cards.find((c) => c.id === cardId);
      if (!card) return { ok: false, error: '카드를 찾을 수 없어요.' };

      const cat = IDEA_CATEGORIES.find((x) => x.value === card.category);
      const cardComments = comments.filter((c) => c.card_id === cardId);

      /* 위키 본문 구성 */
      let content = '';
      content += `<p><strong>${cat?.label || '아이디어'}</strong> · ${card.author_name || '동료'} 작성</p>`;
      content += `<p>${escapeHtml(card.content || '').replace(/\n/g, '<br>')}</p>`;
      if (cardComments.length > 0) {
        content += `<h2>댓글 ${cardComments.length}개</h2>`;
        for (const c of cardComments) {
          content += `<p><strong>${escapeHtml(c.author_name || '동료')}</strong>: ${escapeHtml(c.content).replace(/\n/g, '<br>')}</p>`;
        }
      }

      try {
        /* WikiContext.createDocument는 템플릿 객체 받음 */
        const newDoc = await createDocument({
          title: card.title,
          content,
          category: '기타',
          tags: [cat?.label || '아이디어', card.department].filter(Boolean),
        });
        if (!newDoc) throw new Error('위키 문서 생성 실패');

        /* 카드 상태 업데이트 */
        const { data, error } = await supabase
          .from('idea_cards')
          .update({
            status: 'promoted',
            promoted_to_wiki: newDoc.id,
            promoted_at: new Date().toISOString(),
          })
          .eq('id', cardId)
          .eq('author_id', user.id)
          .select()
          .single();
        if (error) throw error;
        setCards((prev) => prev.map((c) => (c.id === cardId ? data : c)));

        return { ok: true, wikiId: newDoc.id };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, cards, comments, createDocument]
  );

  const openCreateModal = useCallback((preset = null) => {
    setEditingCard(null);
    setCreateModalOpen({ open: true, preset });
  }, []);
  const openEditModal = useCallback((card) => {
    setEditingCard(card);
    setCreateModalOpen({ open: true, preset: null });
  }, []);
  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setEditingCard(null);
  }, []);

  const toggleExpand = useCallback(
    (cardId) => setExpandedCardId((prev) => (prev === cardId ? null : cardId)),
    []
  );

  return (
    <IdeaContext.Provider
      value={{
        cards,
        cardsByCategory,
        myDept,
        loading,
        createModalOpen,
        editingCard,
        openCreateModal,
        openEditModal,
        closeCreateModal,
        expandedCardId,
        toggleExpand,
        reactionsOf,
        commentsOf,
        createCard,
        updateCard,
        deleteCard,
        toggleReaction,
        addComment,
        deleteComment,
        promoteToWiki,
        fetchAll,
      }}
    >
      {children}
    </IdeaContext.Provider>
  );
}

function escapeHtml(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function useIdea() {
  const ctx = useContext(IdeaContext);
  if (!ctx) throw new Error('useIdea must be used within IdeaProvider');
  return ctx;
}