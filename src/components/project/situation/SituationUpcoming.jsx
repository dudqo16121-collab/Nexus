// src/components/project/situation/SituationUpcoming.jsx
// 다가오는 마감 — D-7 이내 + 진행 중인 카드 시간순.

import { useProject } from '../../../contexts/ProjectContext';
import { ddayText, ddayClass } from '../../../utils/projectHelpers';

export default function SituationUpcoming({ tasks }) {
  const { openTaskPanel } = useProject();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + 7);

  const upcoming = tasks
    .filter((t) => {
      if (!t.due_date) return false;
      if (t.status === 'done') return false;
      const d = new Date(t.due_date);
      return d >= today && d <= max;
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <div className="psr-widget">
      <div className="psr-widget-head">
        <h4>
          <i className="fa-regular fa-calendar-check" style={{ color: '#ff9f1c' }} />
          다가오는 마감 (D-7)
        </h4>
        <span className="psr-widget-meta">{upcoming.length}건</span>
      </div>

      {upcoming.length === 0 ? (
        <div className="psr-empty">
          <i className="fa-regular fa-calendar" />
          <p>일주일 내 마감 임박 없음</p>
        </div>
      ) : (
        <ul className="psr-upcoming-list">
          {upcoming.slice(0, 6).map((t) => {
            const cls = ddayClass(t.due_date);
            const color = cls === 'overdue' ? '#f72585' : '#ff9f1c';
            return (
              <li
                key={t.id}
                className="psr-upcoming-item"
                onClick={() => openTaskPanel(t.id)}
              >
                <span
                  className="psr-upcoming-dday"
                  style={{ background: `${color}20`, color }}
                >
                  {ddayText(t.due_date)}
                </span>
                <span className="psr-upcoming-title">{t.title}</span>
                <span className="psr-upcoming-date">{t.due_date}</span>
              </li>
            );
          })}
          {upcoming.length > 6 && (
            <li className="psr-risk-more">외 {upcoming.length - 6}건</li>
          )}
        </ul>
      )}
    </div>
  );
}