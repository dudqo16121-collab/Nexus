// components/feedback/admin/ResponseQueue.jsx
// 미응답 SLA 큐 — 위험순으로 정렬.

import { useFeedback } from '../../../contexts/FeedbackContext';
import { getCategoryMeta } from '../../../config/feedbackTypes';

export default function ResponseQueue({ onPick }) {
  const { slaAlerts } = useFeedback();

  if (slaAlerts.list.length === 0) {
    return (
      <div className="fb-chart-empty">
        <i className="fa-solid fa-circle-check" style={{ color: '#06d6a0' }} />
        <p>모든 피드백에 응답이 완료됐어요</p>
      </div>
    );
  }

  return (
    <div className="fb-queue">
      <div className="fb-queue-summary">
        {slaAlerts.danger > 0 && (
          <span className="fb-queue-pill fb-queue-pill-danger">
            🔴 위험 {slaAlerts.danger}건 (14일+ 미응답)
          </span>
        )}
        {slaAlerts.warning > 0 && (
          <span className="fb-queue-pill fb-queue-pill-warn">
            🟡 경고 {slaAlerts.warning}건 (7일+ 미응답)
          </span>
        )}
      </div>

      <div className="fb-queue-list">
        {slaAlerts.list.map((f) => {
          const cat = getCategoryMeta(f.category);
          return (
            <div key={f.id} className={`fb-queue-item fb-queue-${f.severity}`}>
              <div className="fb-queue-age">
                <strong>{f.ageDays}일</strong>
                <span>경과</span>
              </div>
              <div className="fb-queue-body">
                <div className="fb-queue-tags">
                  <span style={{ color: cat.color }}>
                    {cat.emoji} {cat.label}
                  </span>
                </div>
                <div className="fb-queue-title">{f.title}</div>
                <div className="fb-queue-preview">
                  {(f.body || '').slice(0, 80)}
                  {f.body && f.body.length > 80 ? '...' : ''}
                </div>
              </div>
              {onPick && (
                <button
                  type="button"
                  className="fb-btn-ghost"
                  onClick={() => onPick(f)}
                >
                  보러가기 <i className="fa-solid fa-arrow-right" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}