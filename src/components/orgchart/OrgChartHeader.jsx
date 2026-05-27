// 조직도 코맨드 센터 헤더 — KPI + 검색 + 필터.

import { useOrgChart } from '../../contexts/OrgChartContext';

export default function OrgChartHeader() {
  const {
    members,
    departments,
    kpi,
    search, setSearch,
    selectedDept, setSelectedDept,
    quickFilter, setQuickFilter,
    hasActiveFilter,
    resetFilters,
  } = useOrgChart();

  const KPI_CARDS = [
    {
      key: 'all',
      label: '전체 멤버',
      value: kpi.total,
      icon: 'fa-users',
      color: '#4361ee',
      filterKey: null,
      isActive: !quickFilter && !selectedDept,
    },
    {
      key: 'dept',
      label: '부서',
      value: kpi.deptCount,
      icon: 'fa-building',
      color: '#06d6a0',
      filterKey: null,
      suffix: '개',
    },
    {
      key: 'birthday',
      label: '이번 달 생일',
      value: kpi.birthdayThisMonth,
      icon: 'fa-cake-candles',
      color: '#ff9f1c',
      filterKey: 'birthday',
      isActive: quickFilter === 'birthday',
      highlight: kpi.birthdayToday > 0,
      sub: kpi.birthdayToday > 0 ? `오늘 🎂 ${kpi.birthdayToday}명` : null,
    },
    {
      key: 'new',
      label: '신규 입사 (3개월)',
      value: kpi.newJoiners,
      icon: 'fa-user-plus',
      color: '#f72585',
      filterKey: 'new_joiner',
      isActive: quickFilter === 'new_joiner',
    },
    {
      key: 'admin',
      label: '관리자',
      value: kpi.admins,
      icon: 'fa-shield-halved',
      color: '#8338ec',
      filterKey: 'admin',
      isActive: quickFilter === 'admin',
    },
  ];

  const handleKpiClick = (card) => {
    if (card.key === 'all') {
      resetFilters();
      return;
    }
    if (!card.filterKey) return;
    /* 토글 */
    setQuickFilter(quickFilter === card.filterKey ? null : card.filterKey);
  };

  function ViewModeToggle() {
  const { viewMode, setViewMode } = useOrgChart();
  const modes = [
    { key: 'grid', icon: 'fa-grip', label: '그리드' },
    { key: 'list', icon: 'fa-list', label: '리스트' },
    { key: 'tree', icon: 'fa-sitemap', label: '트리' },
  ];
  return (
    <div className="org-view-toggle">
      {modes.map((m) => (
        <button
          key={m.key}
          type="button"
          className={`org-view-toggle-btn ${viewMode === m.key ? 'active' : ''}`}
          onClick={() => setViewMode(m.key)}
          title={m.label}
        >
          <i className={`fa-solid ${m.icon}`} />
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

  return (
    <header className="org-command-header">
      {/* 타이틀 + 액션 영역 */}
<div className="org-command-top">
        <div>
          <h2>
            <i className="fa-solid fa-sitemap" style={{ color: 'var(--primary-color)', marginRight: 10 }} />
            조직도
            {selectedDept && (
              <span className="org-breadcrumb"> · {selectedDept}</span>
            )}
            {quickFilter === 'birthday' && <span className="org-breadcrumb"> · 🎂 이번 달 생일</span>}
            {quickFilter === 'new_joiner' && <span className="org-breadcrumb"> · 🎉 신규 입사</span>}
            {quickFilter === 'admin' && <span className="org-breadcrumb"> · 👑 관리자</span>}
          </h2>
          <p className="org-command-subtitle">
            우리 조직 한눈에 보기 — 클릭으로 즉시 필터
          </p>
        </div>

        {/* 뷰 토글 */}
        <ViewModeToggle />
      </div>

      {/* KPI 칩 5장 */}
      <div className="org-kpi-strip">
        {KPI_CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`org-kpi-chip ${card.isActive ? 'active' : ''} ${card.highlight ? 'highlight' : ''}`}
            onClick={() => handleKpiClick(card)}
            disabled={card.key === 'dept'}
            style={{ '--kpi-color': card.color }}
          >
            <div className="org-kpi-chip-icon">
              <i className={`fa-solid ${card.icon}`} />
            </div>
            <div className="org-kpi-chip-body">
              <span className="org-kpi-chip-label">{card.label}</span>
              <strong className="org-kpi-chip-value">
                {card.value}
                {card.suffix && <span className="org-kpi-chip-suffix">{card.suffix}</span>}
              </strong>
              {card.sub && <span className="org-kpi-chip-sub">{card.sub}</span>}
            </div>
            {card.highlight && <span className="org-kpi-chip-pulse" />}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="org-command-search">
        <i className="fa-solid fa-magnifying-glass" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 · 부서 · 직급 · 전화번호 · 상태메시지로 검색..."
        />
        {hasActiveFilter && (
          <button
            type="button"
            className="org-command-reset"
            onClick={resetFilters}
            title="필터 모두 초기화"
          >
            <i className="fa-solid fa-rotate-left" />
            초기화
          </button>
        )}
      </div>
    </header>
  );
}