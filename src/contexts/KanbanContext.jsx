import { createContext, useContext, useState, useCallback } from 'react';

const KanbanContext = createContext(null);

/* 초기 샘플 데이터 — Supabase 연동 전 임시용 */
const INITIAL_KANBAN = {
  todo: {
    label: '📋 할 일',
    color: 'var(--primary-color)',
    cards: [
      { id: 's1', title: 'API 문서 작성',      assignee: '김철수',   priority: 'mid'  },
      { id: 's2', title: '로그인 페이지 UI 개선', assignee: '이영희',   priority: 'high' },
    ],
  },
  inprogress: {
    label: '⚙️ 진행 중',
    color: 'var(--warning)',
    cards: [
      { id: 's3', title: 'Supabase RLS 정책 설정', assignee: '박지성', priority: 'high' },
      { id: 's4', title: '모바일 반응형 작업',     assignee: '김철수', priority: 'mid'  },
    ],
  },
  review: {
    label: '🔍 검토 중',
    color: '#9d4edd',
    cards: [
      { id: 's5', title: 'Q2 보고서 검토', assignee: '최마케터', priority: 'low' },
    ],
  },
  done: {
    label: '✅ 완료',
    color: 'var(--success)',
    cards: [
      { id: 's6', title: 'DB 스키마 마이그레이션', assignee: '박지성', priority: 'high' },
    ],
  },
};

export function KanbanProvider({ children }) {
  const [columns, setColumns] = useState(INITIAL_KANBAN);

  /* 카드 추가 */
  const addCard = useCallback((columnId, card) => {
    setColumns((prev) => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        cards: [...prev[columnId].cards, { ...card, id: 'tmp_' + Date.now() }],
      },
    }));
  }, []);

  /* 카드 수정 */
  const updateCard = useCallback((columnId, cardId, updates) => {
    setColumns((prev) => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        cards: prev[columnId].cards.map((c) =>
          c.id === cardId ? { ...c, ...updates } : c
        ),
      },
    }));
  }, []);

  /* 카드 삭제 */
  const deleteCard = useCallback((columnId, cardId) => {
    setColumns((prev) => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        cards: prev[columnId].cards.filter((c) => c.id !== cardId),
      },
    }));
  }, []);

  /* 카드 이동 (드래그 & 드롭용) */
  const moveCard = useCallback((cardId, fromColumn, toColumn) => {
    if (fromColumn === toColumn) return;
    setColumns((prev) => {
      const card = prev[fromColumn].cards.find((c) => c.id === cardId);
      if (!card) return prev;

      return {
        ...prev,
        [fromColumn]: {
          ...prev[fromColumn],
          cards: prev[fromColumn].cards.filter((c) => c.id !== cardId),
        },
        [toColumn]: {
          ...prev[toColumn],
          cards: [...prev[toColumn].cards, card],
        },
      };
    });
  }, []);

  /* 같은 컬럼 내에서 카드 순서 바꾸기 */
  const reorderCard = useCallback((columnId, fromIdx, toIdx) => {
    setColumns((prev) => {
      const cards = [...prev[columnId].cards];
      const [moved] = cards.splice(fromIdx, 1);
      cards.splice(toIdx, 0, moved);
      return {
        ...prev,
        [columnId]: { ...prev[columnId], cards },
      };
    });
  }, []);

  return (
    <KanbanContext.Provider
      value={{ columns, addCard, updateCard, deleteCard, moveCard, reorderCard }}
    >
      {children}
    </KanbanContext.Provider>
  );
}

export const useKanban = () => {
  const ctx = useContext(KanbanContext);
  if (!ctx) throw new Error('useKanban must be used within KanbanProvider');
  return ctx;
};