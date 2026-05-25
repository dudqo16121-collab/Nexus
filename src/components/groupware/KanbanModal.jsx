import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import Modal from '../common/Modal';
import KanbanColumn from './KanbanColumn';
import AddCardModal from './AddCardModal';
import EditCardModal from './EditCardModal';
import { useKanban } from '../../contexts/KanbanContext';

export default function KanbanModal({ isOpen, onClose }) {
  const { columns, deleteCard, moveCard, reorderCard } = useKanban();

  /* 카드 추가 모달 상태 */
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addInitialColumn, setAddInitialColumn] = useState('todo');

  /* 카드 수정 모달 상태 */
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [editingColumn, setEditingColumn] = useState(null);

  /* @dnd-kit 센서 — 마우스/터치/키보드 입력 감지 */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },   /* 5px 이상 움직여야 드래그 시작 → 클릭과 구분 */
    }),
    useSensor(KeyboardSensor)
  );

  /* 카드 ID로 어느 컬럼에 있는지 찾기 */
  const findColumnByCardId = (cardId) => {
    for (const [colId, col] of Object.entries(columns)) {
      if (col.cards.some((c) => c.id === cardId)) return colId;
    }
    return null;
  };

  /* 드래그 종료 시 호출 — 핵심 로직 */
  const handleDragEnd = (event) => {
    const { active, over } = event;

    /* 드롭 위치가 없으면 그냥 종료 */
    if (!over) return;

    const activeId = active.id;                /* 드래그된 카드 id */
    const overId = over.id;                    /* 드롭된 위치의 id (카드 또는 컬럼) */
    if (activeId === overId) return;

    const fromColumn = findColumnByCardId(activeId);
    if (!fromColumn) return;

    /* over.id가 컬럼인지 카드인지 판단 */
    const isOverColumn = !!columns[overId];

    if (isOverColumn) {
      /* 컬럼 영역에 드롭 → 그 컬럼으로 이동 */
      if (fromColumn !== overId) {
        moveCard(activeId, fromColumn, overId);
      }
    } else {
      /* 다른 카드 위에 드롭 → 그 카드 위치로 이동 */
      const toColumn = findColumnByCardId(overId);
      if (!toColumn) return;

      if (fromColumn === toColumn) {
        /* 같은 컬럼 내 순서 변경 */
        const cards = columns[toColumn].cards;
        const fromIdx = cards.findIndex((c) => c.id === activeId);
        const toIdx = cards.findIndex((c) => c.id === overId);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          reorderCard(toColumn, fromIdx, toIdx);
        }
      } else {
        /* 다른 컬럼으로 이동 */
        moveCard(activeId, fromColumn, toColumn);
      }
    }
  };

  const handleAddCard = (columnId) => {
    setAddInitialColumn(columnId);
    setIsAddOpen(true);
  };

  const handleEditCard = (columnId, card) => {
    setEditingCard(card);
    setEditingColumn(columnId);
    setIsEditOpen(true);
  };

  const handleDeleteCard = (columnId, cardId) => {
    if (window.confirm('이 카드를 삭제하시겠습니까?')) {
      deleteCard(columnId, cardId);
    }
  };

  const headerExtra = (
    <button
      onClick={() => handleAddCard('todo')}
      style={{
        background: 'var(--primary-color)',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        padding: '8px 16px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        fontFamily: 'inherit',
      }}
    >
      <i className="fa-solid fa-plus"></i> 카드 추가
    </button>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <>
            <i className="fa-solid fa-diagram-project" style={{ color: 'var(--primary-color)' }}></i>
            칸반보드 전체
          </>
        }
        headerExtra={headerExtra}
      >
        {/* DndContext가 전체 드래그 영역 — 모든 컬럼을 감싸야 함 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-board">
            {Object.entries(columns).map(([columnId, column]) => (
              <KanbanColumn
                key={columnId}
                columnId={columnId}
                column={column}
                onAddCard={handleAddCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
              />
            ))}
          </div>
        </DndContext>
      </Modal>

      <AddCardModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        initialColumn={addInitialColumn}
      />

      <EditCardModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        card={editingCard}
        columnId={editingColumn}
      />
    </>
  );
}