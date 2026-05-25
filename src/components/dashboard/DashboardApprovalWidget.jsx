import { useNavigate } from 'react-router-dom';
import { useApprovalBadge } from '../../hooks/useApprovalBadge';

export default function DashboardApprovalWidget() {
  // 여기 주목: 중괄호 없이 그냥 count 하나만 받음
  const count = useApprovalBadge();
  const navigate = useNavigate();

  return (
    <div
      className="dashboard-approval-widget"
      onClick={() => navigate('/approval')}
      style={{ cursor: 'pointer' }}
    >
      <h3>결재 대기</h3>
      <div
        className="dashboard-approval-count"
        style={{
          color: count > 0 ? '#ef4444' : '#9ca3af',
        }}
      >
        {count} 건
      </div>
      <p className="dashboard-approval-sub">
        {count > 0 ? '승인을 기다리는 문서가 있어요' : '처리할 결재가 없습니다'}
      </p>
    </div>
  );
}