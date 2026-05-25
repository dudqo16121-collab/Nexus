import { useApproval } from '../../contexts/ApprovalContext';

const KPI_CARDS = [
  {
    key: 'pendingMe',
    label: '내 결재 대기',
    sub: '승인 대기 중',
    icon: 'fa-solid fa-inbox',
    color: 'var(--danger, #ef4444)',
    tab: 'pending_me',
  },
  {
    key: 'myDraft',
    label: '내 상신 문서',
    sub: '진행 중 포함',
    icon: 'fa-solid fa-paper-plane',
    color: 'var(--primary-color, #3b82f6)',
    tab: 'my_draft',
  },
  {
    key: 'approved',
    label: '완료 문서',
    sub: '이번 달',
    icon: 'fa-solid fa-circle-check',
    color: 'var(--success, #10b981)',
    tab: 'approved',
  },
  {
    key: 'rejected',
    label: '반려 문서',
    sub: '이번 달',
    icon: 'fa-solid fa-circle-xmark',
    color: 'var(--warning, #f59e0b)',
    tab: 'rejected',
  },
];

export default function ApprovalKPI() {
  const { kpi, setTab } = useApproval();

  return (
    <div className="appr-kpi-grid">
      {KPI_CARDS.map((card) => (
        <div
          key={card.key}
          className="appr-kpi-card"
          onClick={() => setTab(card.tab)}
        >
          <h3>
            <i className={card.icon} style={{ color: card.color, marginRight: 6 }}></i>
            {card.label}
          </h3>
          <div className="appr-kpi-count" style={{ color: card.color }}>
            {kpi[card.key]}
          </div>
          <p className="appr-kpi-sub">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}