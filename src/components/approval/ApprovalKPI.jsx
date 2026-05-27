// 결재함 가로 펼친 헤더 — KPI 카드 + 양식별 통계 띠.

import { useApproval } from '../../contexts/ApprovalContext';

const KPI_CARDS = [
  {
    key: 'pendingMe',
    label: '내 결재 대기',
    sub: '내 차례입니다',
    icon: 'fa-inbox',
    color: '#f72585',
    tab: 'pending_me',
    urgent: true,
  },
  {
    key: 'myDraft',
    label: '내 상신 진행중',
    sub: '결재자 대기 중',
    icon: 'fa-paper-plane',
    color: '#4361ee',
    tab: 'my_draft',
  },
  {
    key: 'drafts',
    label: '임시저장',
    sub: '미상신 문서',
    icon: 'fa-file-pen',
    color: '#94a3b8',
    tab: 'my_draft',
  },
  {
    key: 'approved',
    label: '완료',
    sub: '이번 달',
    icon: 'fa-circle-check',
    color: '#06d6a0',
    tab: 'approved',
  },
  {
    key: 'rejected',
    label: '반려',
    sub: '이번 달',
    icon: 'fa-circle-xmark',
    color: '#ff9f1c',
    tab: 'rejected',
  },
  {
    key: 'avgHours',
    label: '평균 처리시간',
    sub: '내 문서 기준',
    icon: 'fa-stopwatch',
    color: '#8338ec',
    tab: null, // 클릭 비활성
    suffix: '시간',
    decimals: 1,
  },
];

/* 양식별 메타 — 칩 표시용 */
const TYPE_META = {
  업무기안서: { icon: 'fa-briefcase',    color: '#4361ee' },
  지출결의서: { icon: 'fa-coins',        color: '#f72585' },
  연차신청서: { icon: 'fa-umbrella-beach', color: '#06d6a0' },
  출장신청서: { icon: 'fa-plane',        color: '#ff9f1c' },
  구매요청서: { icon: 'fa-cart-shopping', color: '#8338ec' },
  품의서:     { icon: 'fa-file-lines',   color: '#64748b' },
};

export default function ApprovalKPI() {
  const { kpi, setTab, setTypeFilter, tab } = useApproval();

  const handleCardClick = (card) => {
    if (!card.tab) return;
    setTab(card.tab);
    setTypeFilter('');
  };

  const handleTypeClick = (type) => {
    setTypeFilter(type);
    setTab('all');
  };

  /* 양식별 카운트를 카운트 큰 순으로 정렬 */
  const typeEntries = Object.entries(kpi.byType || {})
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="appr-power-header">
      {/* KPI 6장 — 가로 펼침 */}
      <div className="appr-kpi-row">
        {KPI_CARDS.map((card) => {
          const value = kpi[card.key] ?? 0;
          const isActive = card.tab && tab === card.tab;
          const isClickable = !!card.tab;
          const displayValue = card.decimals
            ? value.toFixed(card.decimals)
            : value;

          return (
            <div
              key={card.key}
              className={`appr-kpi-card-v2 ${isActive ? 'active' : ''} ${isClickable ? 'clickable' : ''} ${card.urgent && value > 0 ? 'urgent' : ''}`}
              onClick={() => handleCardClick(card)}
              style={{ '--card-color': card.color }}
            >
              <div className="appr-kpi-icon" style={{ background: `${card.color}15`, color: card.color }}>
                <i className={`fa-solid ${card.icon}`} />
              </div>
              <div className="appr-kpi-body">
                <span className="appr-kpi-label">{card.label}</span>
                <strong className="appr-kpi-value" style={{ color: card.color }}>
                  {displayValue}
                  {card.suffix && <span className="appr-kpi-suffix">{card.suffix}</span>}
                </strong>
                <span className="appr-kpi-sub">{card.sub}</span>
              </div>
              {card.urgent && value > 0 && (
                <span className="appr-kpi-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* 양식별 통계 띠 */}
      {typeEntries.length > 0 && (
        <div className="appr-type-strip">
          <div className="appr-type-strip-label">
            <i className="fa-solid fa-chart-simple" />
            <span>진행 중 양식별</span>
            <span className="appr-type-strip-total">
              · 총 {Object.values(kpi.byType).reduce((a, b) => a + b, 0)}건
            </span>
          </div>
          <div className="appr-type-strip-chips">
            {typeEntries.map(([type, count]) => {
              const meta = TYPE_META[type] || { icon: 'fa-file', color: '#64748b' };
              return (
                <button
                  key={type}
                  type="button"
                  className="appr-type-chip-v2"
                  onClick={() => handleTypeClick(type)}
                  style={{
                    '--type-color': meta.color,
                  }}
                >
                  <i className={`fa-solid ${meta.icon}`} />
                  <span className="appr-type-chip-name">{type}</span>
                  <span className="appr-type-chip-count">{count}</span>
                </button>
              );
            })}
          </div>
          {/* 이번 주 활동 */}
          {kpi.weekProcessed > 0 && (
            <div className="appr-week-stat">
              <i className="fa-solid fa-bolt" />
              이번 주 {kpi.weekProcessed}건 처리
            </div>
          )}
        </div>
      )}
    </div>
  );
}