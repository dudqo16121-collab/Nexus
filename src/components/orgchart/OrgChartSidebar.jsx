// 조직도 사이드바 — 부서별 막대 차트 + 색상 시스템.

import { useOrgChart } from '../../contexts/OrgChartContext';
import { Skeleton } from '../common/Skeleton';

export default function OrgChartSidebar() {
  const { departments, members, selectedDept, setSelectedDept, loading } = useOrgChart();

  const maxCount = Math.max(...departments.map((d) => d.members.length), 1);

  return (
    <aside className="org-command-sidebar">
      <div className="org-sidebar-section">
        <h4 className="org-sidebar-title">
          <i className="fa-solid fa-building-user" /> 부서별 분포
        </h4>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height="46px" radius="10px" />
            ))}
          </div>
        ) : (
          <div className="org-dept-bars">
            <button
              type="button"
              className={`org-dept-bar all ${selectedDept === null ? 'active' : ''}`}
              onClick={() => setSelectedDept(null)}
            >
              <div className="org-dept-bar-head">
                <span className="org-dept-bar-label">
                  <i className="fa-solid fa-globe" style={{ color: '#4361ee' }} />
                  전체
                </span>
                <strong className="org-dept-bar-count">{members.length}</strong>
              </div>
              <div className="org-dept-bar-track">
                <span
                  className="org-dept-bar-fill"
                  style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, #4361ee, #8338ec)',
                  }}
                />
              </div>
            </button>

            {departments.map((d) => {
              const pct = (d.members.length / maxCount) * 100;
              const isActive = selectedDept === d.name;
              return (
                <button
                  key={d.name}
                  type="button"
                  className={`org-dept-bar ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedDept(isActive ? null : d.name)}
                  style={{ '--dept-color': d.color }}
                >
                  <div className="org-dept-bar-head">
                    <span className="org-dept-bar-label">
                      <i
                        className={`fa-solid ${d.icon}`}
                        style={{ color: d.color }}
                      />
                      {d.name}
                    </span>
                    <strong className="org-dept-bar-count">{d.members.length}</strong>
                  </div>
                  <div className="org-dept-bar-track">
                    <span
                      className="org-dept-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: d.color,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}