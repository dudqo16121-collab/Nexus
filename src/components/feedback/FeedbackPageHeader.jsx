// components/feedback/FeedbackPageHeader.jsx
// 페이지 헤더 — Wellbeing 패턴 차용.

import { useFeedback } from '../../contexts/FeedbackContext';

export default function FeedbackPageHeader() {
  const { feedbacks, slaAlerts, isAdmin } = useFeedback();

  const openCount = feedbacks.filter((f) => f.status === 'open').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'resolved').length;

  return (
    <header className="fb-page-header">
      <div>
        <h1>
          <span className="fb-icon-box">
            <i className="fa-solid fa-comment-dots" />
          </span>
          익명 피드백 박스
        </h1>
        <p className="fb-page-tagline">
          🔒 작성자 정보를 저장하지 않습니다. 솔직한 의견을 자유롭게 남겨주세요.
        </p>
      </div>

      <div className="fb-page-stats">
        <div className="fb-stat-pill">
          <strong>{feedbacks.length}</strong>
          <span>전체</span>
        </div>
        <div className="fb-stat-pill fb-stat-warn">
          <strong>{openCount}</strong>
          <span>대기</span>
        </div>
        <div className="fb-stat-pill fb-stat-ok">
          <strong>{resolvedCount}</strong>
          <span>반영</span>
        </div>
        {isAdmin && (slaAlerts.warning + slaAlerts.danger > 0) && (
          <div className="fb-stat-pill fb-stat-danger">
            <strong>{slaAlerts.warning + slaAlerts.danger}</strong>
            <span>미응답</span>
          </div>
        )}
      </div>
    </header>
  );
}