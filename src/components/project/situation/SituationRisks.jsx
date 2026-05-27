// src/components/project/situation/SituationRisks.jsx
// 위험 신호 — 지연된 카드 / 담당자 없는 카드 / 우선순위 긴급 카드.

import { useProject } from '../../../contexts/ProjectContext';

function isOverdue(t) {
  if (!t.due_date) return false;
  if (t.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(t.due_date) < today;
}

export default function SituationRisks({ tasks }) {
  const { openTaskPanel } = useProject();

  const overdue = tasks.filter(isOverdue);
  const unassigned = tasks.filter((t) => !t.assignee_id && t.status !== 'done');
  const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done');

  /* 위험도 합산 — 중복 제거 (한 카드가 여러 위험에 해당하면 한번만 표시, 우선 overdue > unassigned > urgent) */
  const seen = new Set();
  const items = [];
  const push = (t, reason, color) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    items.push({ ...t, _reason: reason, _color: color });
  };
  overdue.forEach((t) => push(t, '마감 지남', '#f72585'));
  urgent.forEach((t) => push(t, '긴급 우선순위', '#ff9f1c'));
  unassigned.forEach((t) => push(t, '담당자 미지정', '#94a3b8'));

  return (
    <div className="psr-widget">
      <div className="psr-widget-head">
        <h4>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f72585' }} />
          위험 신호
        </h4>
        <span className="psr-widget-meta">{items.length}건</span>
      </div>

      {items.length === 0 ? (
        <div className="psr-empty psr-empty-success">
          <i className="fa-solid fa-circle-check" style={{ color: '#06d6a0' }} />
          <p>위험 신호 없음 — 순항 중!</p>
        </div>
      ) : (
        <ul className="psr-risk-list">
          {items.slice(0, 5).map((t) => (
            <li
              key={t.id}
              className="psr-risk-item"
              onClick={() => openTaskPanel(t.id)}
            >
              <span className="psr-risk-badge" style={{ background: `${t._color}20`, color: t._color }}>
                {t._reason}
              </span>
              <span className="psr-risk-title">{t.title}</span>
              {t.due_date && (
                <span className="psr-risk-date">
                  <i className="fa-regular fa-clock" /> {t.due_date}
                </span>
              )}
            </li>
          ))}
          {items.length > 5 && (
            <li className="psr-risk-more">외 {items.length - 5}건 더 있음</li>
          )}
        </ul>
      )}
    </div>
  );
}