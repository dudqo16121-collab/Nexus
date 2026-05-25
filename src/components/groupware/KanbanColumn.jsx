import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

export default function KanbanColumn({ columnId, column, onAddCard, onEditCard, onDeleteCard }) {
  /* 이 컬럼을 드롭 영역으로 등록 */
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { columnId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-col ${isOver ? 'drag-over' : ''}`}
    >
      <div className="kanban-col-header">
        <div className="kanban-col-title">
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: column.color,
              display: 'inline-block',
            }}
          ></span>
          {column.label}
        </div>
        <span className="kanban-badge">{column.cards.length}</span>
      </div>

      {/* 정렬 가능한 영역 — 컬럼 안의 카드들 */}
      <SortableContext
        items={column.cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="kanban-cards">
          {column.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              columnId={columnId}
              onEdit={() => onEditCard(columnId, card)}
              onDelete={() => onDeleteCard(columnId, card.id)}
            />
          ))}
        </div>
      </SortableContext>

      <button className="kanban-add-btn" onClick={() => onAddCard(columnId)}>
        + 빠른 추가
      </button>
    </div>
  );
}