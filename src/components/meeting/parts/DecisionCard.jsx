// components/meeting/parts/DecisionCard.jsx
// 결정/액션/질문/메모 단일 카드 — 인라인 편집.

import { useState } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getDecisionTypeMeta } from '../../../config/meetingCanvasConfig';

export default function DecisionCard({ decision }) {
  const { user } = useAuth();
  const { current, updateDecision, removeDecision } = useMeetingCanvas();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    content: decision.content,
    owner_id: decision.owner_id || '',
    due_date: decision.due_date || '',
  });

  const meta = getDecisionTypeMeta(decision.type);
  const isAction = decision.type === 'action';
  const canEdit = current?.canvas?.host_id === user?.id
    || current?.attendees?.some((a) => a.user_id === user?.id);

  const ownerCandidates = (current?.attendees || []).map((a) => ({
    id: a.user_id, name: a.user_name,
  }));
  const owner = ownerCandidates.find((o) => o.id === decision.owner_id);

  const handleSave = async () => {
    if (!draft.content.trim()) {
      toast.warning('내용을 입력해주세요');
      return;
    }
    const ownerObj = ownerCandidates.find((o) => o.id === draft.owner_id);
    const patch = {
      content: draft.content.trim(),
      owner_id: ownerObj?.id || null,
      owner_name: ownerObj?.name || null,
      due_date: draft.due_date || null,
    };
    const res = await updateDecision(decision.id, patch);
    if (res.ok) setEditing(false);
    else toast.error(res.error);
  };

  const handleRemove = async () => {
    if (!confirm('이 항목을 삭제할까요?')) return;
    const res = await removeDecision(decision.id);
    if (!res.ok) toast.error(res.error);
  };

  const handleResolve = async () => {
    const res = await updateDecision(decision.id, { resolved: !decision.resolved });
    if (!res.ok) toast.error(res.error);
  };

  /* 마감일까지 D-day 계산 */
  const ddayText = (() => {
    if (!decision.due_date) return null;
    const due = new Date(decision.due_date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((due - today) / 86400_000);
    if (diff === 0) return 'D-day';
    if (diff > 0) return `D-${diff}`;
    return `D+${-diff}`;
  })();
  const ddayColor = decision.due_date && new Date(decision.due_date) < new Date()
    ? '#f72585' : '#94a3b8';

  if (editing) {
    return (
      <article
        className="mc-decision-card editing"
        style={{ borderLeftColor: meta.color }}
      >
        <textarea
          className="mc-input"
          rows={3}
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          autoFocus
        />
        {isAction && (
          <div className="mc-decision-edit-row">
            <select
              className="mc-input"
              value={draft.owner_id}
              onChange={(e) => setDraft({ ...draft, owner_id: e.target.value })}
            >
              <option value="">담당자</option>
              {ownerCandidates.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <input
              type="date"
              className="mc-input"
              value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
            />
          </div>
        )}
        <div className="mc-decision-edit-buttons">
          <button type="button" className="mc-btn-sm primary" onClick={handleSave}>저장</button>
          <button type="button" className="mc-btn-sm" onClick={() => setEditing(false)}>취소</button>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`mc-decision-card ${decision.resolved ? 'resolved' : ''} ${decision.task_id ? 'has-task' : ''}`}
      style={{ borderLeftColor: meta.color }}
    >
      <div className="mc-decision-head">
        <span
          className="mc-decision-type"
          style={{ color: meta.color }}
        >
          <i className={`fa-solid ${meta.icon}`} /> {meta.label}
        </span>
        {decision.task_id && (
          <span className="mc-decision-task-badge" title="칸반 카드로 변환됨">
            <i className="fa-solid fa-link" /> 카드 연결됨
          </span>
        )}
        {canEdit && (
          <div className="mc-decision-tools">
            <button
              type="button"
              className="mc-icon-btn"
              onClick={() => setEditing(true)}
              title="수정"
            >
              <i className="fa-solid fa-pen" />
            </button>
            <button
              type="button"
              className="mc-icon-btn mc-icon-danger"
              onClick={handleRemove}
              title="삭제"
            >
              <i className="fa-solid fa-trash" />
            </button>
          </div>
        )}
      </div>

      <div className="mc-decision-content">
        {isAction && (
          <button
            type="button"
            className="mc-decision-check"
            onClick={handleResolve}
            title={decision.resolved ? '완료 해제' : '완료로 표시'}
          >
            {decision.resolved
              ? <i className="fa-solid fa-check-circle" style={{ color: '#06d6a0' }} />
              : <i className="fa-regular fa-circle" />
            }
          </button>
        )}
        <p>{decision.content}</p>
      </div>

      {isAction && (owner || decision.due_date) && (
        <div className="mc-decision-meta">
          {owner && (
            <span className="mc-decision-owner">
              <i className="fa-solid fa-user" /> {owner.name}
            </span>
          )}
          {decision.due_date && (
            <span className="mc-decision-due" style={{ color: ddayColor }}>
              <i className="fa-regular fa-clock" /> {decision.due_date} · {ddayText}
            </span>
          )}
        </div>
      )}
    </article>
  );
}