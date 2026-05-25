// components/meeting/parts/LiveAgendaPanel.jsx
// Live 단계 안건 패널 — "진행 중" 토글 + 완료 표시.

import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useToast } from '../../../contexts/ToastContext';

export default function LiveAgendaPanel() {
  const { current, updateAgendaItem } = useMeetingCanvas();
  const toast = useToast();

  if (!current) return null;
  const { agendaItems } = current;

  const handleStatusChange = async (item, newStatus) => {
    /* 다른 안건이 진행 중이면 그것을 done 으로, 새 안건을 discussing 으로 */
    if (newStatus === 'discussing') {
      const currentDiscussing = agendaItems.find((a) => a.status === 'discussing' && a.id !== item.id);
      if (currentDiscussing) {
        await updateAgendaItem(currentDiscussing.id, { status: 'done' });
      }
    }
    const res = await updateAgendaItem(item.id, { status: newStatus });
    if (!res.ok) toast.error(res.error);
  };

  const doneCount = agendaItems.filter((a) => a.status === 'done').length;
  const totalCount = agendaItems.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <aside className="mc-live-agenda">
      <div className="mc-live-agenda-head">
        <h3>
          <i className="fa-solid fa-list-check" />
          안건 진행
        </h3>
        <div className="mc-live-agenda-progress">
          <div className="mc-live-progress-bar">
            <div className="mc-live-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="mc-live-progress-text">{doneCount}/{totalCount}</span>
        </div>
      </div>

      {agendaItems.length === 0 ? (
        <div className="mc-empty-hint">
          <i className="fa-regular fa-lightbulb" />
          <p>안건이 없어요</p>
        </div>
      ) : (
        <ol className="mc-live-agenda-list">
          {agendaItems.map((item, idx) => {
            const isActive = item.status === 'discussing';
            const isDone = item.status === 'done';
            const isPostponed = item.status === 'postponed';

            return (
              <li
                key={item.id}
                className={`mc-live-agenda-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isPostponed ? 'postponed' : ''}`}
              >
                <div className="mc-live-agenda-main">
                  <button
                    type="button"
                    className="mc-live-agenda-check"
                    onClick={() => {
                      const nextStatus = isDone ? 'pending' : 'done';
                      handleStatusChange(item, nextStatus);
                    }}
                    title={isDone ? '완료 해제' : '완료로 표시'}
                  >
                    {isDone ? (
                      <i className="fa-solid fa-check-circle" />
                    ) : (
                      <i className="fa-regular fa-circle" />
                    )}
                  </button>

                  <div
                    className="mc-live-agenda-body"
                    onClick={() => {
                      if (isDone) return;
                      const nextStatus = isActive ? 'pending' : 'discussing';
                      handleStatusChange(item, nextStatus);
                    }}
                    style={{ cursor: isDone ? 'default' : 'pointer' }}
                  >
                    <div className="mc-live-agenda-topic">
                      <span className="mc-live-agenda-num">{idx + 1}.</span>
                      {item.topic}
                    </div>
                    <div className="mc-live-agenda-meta">
                      {item.owner_name && (
                        <span><i className="fa-solid fa-user" /> {item.owner_name}</span>
                      )}
                      {item.duration_min && (
                        <span><i className="fa-regular fa-clock" /> {item.duration_min}분</span>
                      )}
                      {isActive && <span className="mc-live-agenda-status">진행 중 ●</span>}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}