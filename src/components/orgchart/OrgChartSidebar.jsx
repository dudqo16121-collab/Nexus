// 조직도 좌측 — 부서 트리.

import { useOrgChart } from '../../contexts/OrgChartContext';
import { Skeleton } from '../common/Skeleton';

export default function OrgChartSidebar() {
  const { departments, members, selectedDept, setSelectedDept, loading } = useOrgChart();

  return (
    <aside className="org-sidebar">
      <h4 className="org-sidebar-title">
        <i className="fa-solid fa-sitemap" /> 부서
      </h4>

      <div className="org-dept-list">
        <button
          type="button"
          className={`org-dept-item ${selectedDept === null ? 'active' : ''}`}
          onClick={() => setSelectedDept(null)}
        >
          <span><i className="fa-solid fa-building" /> 전체</span>
          <span className="org-dept-count">{members.length}</span>
        </button>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 4 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height="36px" radius="8px" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="org-empty">등록된 부서가 없어요</div>
        ) : (
          departments.map((d) => (
            <button
              key={d.name}
              type="button"
              className={`org-dept-item ${selectedDept === d.name ? 'active' : ''}`}
              onClick={() => setSelectedDept(d.name)}
            >
              <span>
                <i className="fa-regular fa-folder" /> {d.name}
              </span>
              <span className="org-dept-count">{d.members.length}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}