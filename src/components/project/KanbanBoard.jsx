// components/project/KanbanBoard.jsx
// 칸반 보드 4컬럼 — 원본 renderKanbanShell + renderTasks + bindKanbanDnD 이관.
// 컬럼별 카운트 / + 버튼(빠른 추가) / 드래그앤드롭 컬럼 간 이동.

import { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { TASK_COLUMNS } from '../../config/projectConfig';
import TaskCard from './TaskCard';
import { useToast } from '../../contexts/ToastContext';

export default function KanbanBoard() {
  const toast = useToast();
  const { tasks, selectedProjectId, createTask, moveTask } = useProject();

  /* 빠른 추가 — 어떤 컬럼이 인라인 입력 중인지 */
  const [quickAddStatus, setQuickAddStatus] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* 드래그 오버 중인 컬럼 id — 시각적 표시용 */
  const [dragOverCol, setDragOverCol] = useState(null);

  if (!selectedProjectId) {
    return null;
  }

  const handleQuickAddOpen = (status) => {
    setQuickAddStatus(status);
    setQuickTitle('');
  };

  const handleQuickAddSubmit = async () => {
    if (submitting) return;
    if (!quickTitle.trim()) {
      setQuickAddStatus(null);
      return;
    }
    setSubmitting(true);
    const result = await createTask(quickAddStatus, quickTitle);
    setSubmitting(false);
    if (result.ok) {
      setQuickTitle('');
      // 입력 유지: 연속 추가 가능. 빈 입력으로 Enter 또는 ESC 시 닫힘.
    } else {
      toast.error(`태스크 생성 실패: ${result.error || ''}`);
    }
  };

  const handleQuickKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAddSubmit();
    } else if (e.key === 'Escape') {
      setQuickAddStatus(null);
      setQuickTitle('');
    }
  };

  /* 드롭 핸들러 */
  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  };
  const handleDragLeave = (colId) => {
    if (dragOverCol === colId) setDragOverCol(null);
  };
  const handleDrop = async (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    await moveTask(taskId, colId);
  };

  return (
    <div className="pm-kanban" id="pm-kanban">
      {TASK_COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
        const isQuickAdding = quickAddStatus === col.id;

        return (
          <div
            key={col.id}
            className="pm-col"
            data-status={col.id}
          >
            <div className="pm-col-header">
              <div className="pm-col-title">
                {col.title}
                <span className="pm-col-count">{items.length}</span>
              </div>
              <button
                type="button"
                className="pm-col-add"
                title="태스크 추가"
                onClick={() => handleQuickAddOpen(col.id)}
              >
                <i className="fa-solid fa-plus" />
              </button>
            </div>

            <div
              className={`pm-col-body ${dragOverCol === col.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => handleDragLeave(col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {items.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}

              {/* 빠른 추가 인라인 입력 */}
              {isQuickAdding && (
                <div className="pm-quick-add">
                  <input
                    type="text"
                    autoFocus
                    placeholder="태스크 제목 (Enter 로 추가, ESC 로 닫기)"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={handleQuickKeyDown}
                    onBlur={() => {
                      // 입력 비어있으면 닫기
                      if (!quickTitle.trim()) setQuickAddStatus(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddSubmit}
                    disabled={submitting}
                  >
                    추가
                  </button>
                </div>
              )}

              {items.length === 0 && !isQuickAdding && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px 10px',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    opacity: 0.6,
                  }}
                >
                  비어있음
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}