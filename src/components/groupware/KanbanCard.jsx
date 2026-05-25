import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRIORITY_MAP = {
  high: { cls: 'p-high', text: '높음' },
  mid:  { cls: 'p-mid',  text: '보통' },
  low:  { cls: 'p-low',  text: '낮음' },
};

export default function KanbanCard({ card, columnId, onEdit, onDelete }) {
  const p = PRIORITY_MAP[card.priority] || PRIORITY_MAP.mid;

  /* @dnd-kit 훅 — 이 카드를 드래그 가능하게 */
  const {
    attributes,      /* aria 등 접근성 속성들 */
    listeners,       /* 마우스/터치 이벤트 핸들러 */
    setNodeRef,      /* DOM 노드 등록 */
    transform,       /* 드래그 중 위치 변환 */
    transition,      /* 부드러운 전환 효과 */
    isDragging,      /* 현재 드래그 중인지 */
  } = useSortable({
    id: card.id,
    data: { card, columnId },   /* 드래그 종료 시 어디서 왔는지 알려줌 */
  });

  /* 드래그 중일 때 적용할 스타일 */
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-card"
      {...attributes}
      {...listeners}
      onClick={onEdit}
    >
      <div className="kanban-card-title">{card.title}</div>
      <div className="kanban-card-meta">
        <span className={`kanban-priority ${p.cls}`}>{p.text}</span>
        <span>
          <i className="fa-solid fa-user" style={{ marginRight: 4 }}></i>
          {card.assignee || '미지정'}
        </span>
      </div>
      <div
        className="kanban-card-actions"
        style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}
        /* 액션 영역은 드래그 안 되게 — 클릭 이벤트만 받게 */
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <i
          className="fa-solid fa-pen"
          title="수정"
          style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        ></i>
        <i
          className="fa-solid fa-trash"
          title="삭제"
          style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        ></i>
      </div>
    </div>
  );
}