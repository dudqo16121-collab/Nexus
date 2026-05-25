// 조직도 상단 — 타이틀 + 검색 + 통계.

import { useOrgChart } from '../../contexts/OrgChartContext';

export default function OrgChartHeader() {
  const { members, departments, search, setSearch, selectedDept } = useOrgChart();

  return (
    <header className="org-header">
      <div className="org-header-left">
        <h2>
          <i className="fa-solid fa-sitemap" style={{ color: 'var(--primary-color)', marginRight: 10 }} />
          조직도
          {selectedDept && (
            <span className="org-header-breadcrumb"> · {selectedDept}</span>
          )}
        </h2>
        <div className="org-header-stat">
          <span>
            <i className="fa-solid fa-users" /> {members.length}명
          </span>
          <span>
            <i className="fa-solid fa-building" /> {departments.length}개 부서
          </span>
        </div>
      </div>

      <div className="org-header-right">
        <div className="org-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 부서로 검색..."
          />
          {search && (
            <button
              type="button"
              className="org-search-clear"
              onClick={() => setSearch('')}
              title="지우기"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}