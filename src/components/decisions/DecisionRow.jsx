// components/decisions/DecisionRow.jsx
// 의사결정 추적기의 결정 한 행 — 회의 맥락을 함께 표시.

import { useNavigate } from 'react-router-dom';
import { useMeetingCanvas } from '../../contexts/MeetingCanvasContext';
import { getDecisionTypeMeta, getPhaseMeta } from '../../config/meetingCanvasConfig';

function fmtDate(iso) {
  if (!iso) return '날짜 미정';
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return iso; }
}

function dDayText(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400_000);
  if (diff === 0) return 'D-day';
  if (diff > 0) return `D-${diff}`;
  return `D+${-diff}`;
}

export default function DecisionRow({ row }) {
  const navigate = useNavigate();
  const { fetchCanvas } = useMeetingCanvas();
  const { decision, canvas } = row;
  const meta = getDecisionTypeMeta(decision.type);
  const phaseMeta = canvas ? getPhaseMeta(canvas.phase) : null;
  const isAction = decision.type === 'action';

  const handleOpenMeeting = () => {
    if (!canvas) return;
    fetchCanvas(canvas.id);
    navigate('/meetings');
  };

  const dDay = isAction ? dDayText(decision.due_date) : null;
  const overdue = isAction && decision.due_date && new Date(decision.due_date) < new Date();
  const dDayColor = overdue ? '#f72585' : '#94a3b8';

  return (
    <article
      className={`dt-row ${decision.resolved ? 'resolved' : ''}`}
      style={{ borderLeftColor: meta.color }}
    >
      <div className="dt-row-head">
        <span className="dt-row-type" style={{ color: meta.color }}>
          <i className={`fa-solid ${meta.icon}`} /> {meta.label}
        </span>

        {decision.task_id && (
          <span className="dt-row-task-badge" title="칸반 카드로 변환됨">
            <i className="fa-solid fa-link" /> 카드 연결
          </span>
        )}

        {isAction && decision.resolved && (
          <span className="dt-row-resolved-badge">
            <i className="fa-solid fa-check-circle" /> 완료
          </span>
        )}

        <span className="dt-row-date">
          {fmtDate(decision.created_at)}
        </span>
      </div>

      <div className="dt-row-content">{decision.content}</div>

      {isAction && (decision.owner_name || decision.due_date) && (
        <div className="dt-row-action-meta">
          {decision.owner_name && (
            <span>
              <i className="fa-solid fa-user" /> {decision.owner_name}
            </span>
          )}
          {decision.due_date && (
            <span style={{ color: dDayColor }}>
              <i className="fa-regular fa-clock" /> {decision.due_date} · {dDay}
            </span>
          )}
        </div>
      )}

      {canvas && (
        <button
          type="button"
          className="dt-row-canvas-link"
          onClick={handleOpenMeeting}
          title="회의 캔버스 열기"
        >
          <i className="fa-solid fa-microphone" style={{ color: '#ec4899' }} />
          <span className="dt-row-canvas-title">{canvas.title}</span>
          {phaseMeta && (
            <span
              className="dt-row-canvas-phase"
              style={{ background: `${phaseMeta.color}20`, color: phaseMeta.color }}
            >
              {phaseMeta.label}
            </span>
          )}
          {canvas.host_name && (
            <span className="dt-row-canvas-host">
              <i className="fa-solid fa-user-tie" /> {canvas.host_name}
            </span>
          )}
          {canvas.scheduled_at && (
            <span className="dt-row-canvas-date">
              {fmtDate(canvas.scheduled_at)}
            </span>
          )}
          <i className="fa-solid fa-arrow-right dt-row-canvas-arrow" />
        </button>
      )}
    </article>
  );
}