// components/project/TaskCard.jsx
// 태스크 카드 1개 — 원본 renderTasks 의 .pm-task 마크업 이관.
// HTML5 native drag&drop 으로 컬럼 간 이동 지원.

import { useProject } from '../../contexts/ProjectContext';
import { PRIORITY_META } from '../../config/projectConfig';
import {
  ddayText,
  ddayClass,
  assigneeAvatar,
} from '../../utils/projectHelpers';

/* 우선순위별 좌측 바 컬러 — CSS 변수 --pm-pri-color 로 주입 */
const PRI_COLOR = {
  low: '#94a3b8',
  medium: '#94a3b8',
  high: '#ff9f1c',
  urgent: '#f72585',
};

export default function TaskCard({ task }) {
  const { allUsers, openTaskPanel } = useProject();

  const assignee = task.assignee_id
    ? allUsers.find((u) => u.id === task.assignee_id)
    : null;
  const pri = PRIORITY_META[task.priority] || {};
  const ddayCls = ddayClass(task.due_date);

  /* 원본 HTML5 drag&drop: dragstart 에 taskId 를 setData,
     KanbanBoard 컬럼이 drop 에서 받아 moveTask 호출. */
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  return (
    <div
      className="pm-task-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => openTaskPanel(task.id)}
      style={{ '--pm-pri-color': PRI_COLOR[task.priority] || PRI_COLOR.medium }}
    >
      <div className="pm-task-title">{task.title}</div>
      <div className="pm-task-meta">
        <span className="pm-task-pri">
          {pri.icon} {pri.label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {task.due_date && (
            <span className={`pm-task-due ${ddayCls}`}>
              <i className="fa-regular fa-clock" /> {ddayText(task.due_date)}
            </span>
          )}
          {assignee && (
            <span
              title={assignee.name}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundImage: `url('${assigneeAvatar(assignee)}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                flexShrink: 0,
              }}
            />
          )}
        </span>
      </div>
    </div>
  );
}