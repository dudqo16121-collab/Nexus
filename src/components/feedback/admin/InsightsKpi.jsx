// components/feedback/admin/InsightsKpi.jsx
// 인사이트 상단 KPI 4개 — 전체/응답률/평균응답시간/미응답

import { useFeedback } from '../../../contexts/FeedbackContext';

function Card({ icon, color, label, value, sub, danger }) {
  return (
    <div className={`fb-insight-kpi ${danger ? 'danger' : ''}`}>
      <div className="fb-insight-kpi-icon" style={{ background: `${color}15`, color }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="fb-insight-kpi-body">
        <div className="fb-insight-kpi-label">{label}</div>
        <div className="fb-insight-kpi-value">{value}</div>
        {sub && <div className="fb-insight-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function InsightsKpi() {
  const { feedbacks, responseRate, avgResponseDays, slaAlerts } = useFeedback();

  const pendingCount = slaAlerts.warning + slaAlerts.danger;

  return (
    <div className="fb-insight-kpi-grid">
      <Card
        icon="fa-comments"
        color="#4361ee"
        label="전체 피드백"
        value={feedbacks.length.toLocaleString()}
        sub="누적 작성 건수"
      />
      <Card
        icon="fa-reply"
        color="#06d6a0"
        label="응답률"
        value={`${Math.round(responseRate * 100)}%`}
        sub={`${feedbacks.filter((f) => f.response_count > 0).length}건 응답`}
      />
      <Card
        icon="fa-clock"
        color="#ffd166"
        label="평균 응답 시간"
        value={avgResponseDays != null ? `${avgResponseDays.toFixed(1)}일` : '—'}
        sub="첫 응답까지"
      />
      <Card
        icon="fa-triangle-exclamation"
        color="#f72585"
        label="미응답 누적"
        value={pendingCount}
        sub={slaAlerts.danger > 0 ? `🔴 위험 ${slaAlerts.danger}건` : '양호'}
        danger={pendingCount > 0}
      />
    </div>
  );
}