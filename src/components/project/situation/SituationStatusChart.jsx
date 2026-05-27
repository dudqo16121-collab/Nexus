// src/components/project/situation/SituationStatusChart.jsx
// 칸반 컬럼별 카드 분포 — 가로 누적 막대 + 컬럼별 카운트.

import { TASK_COLUMNS } from '../../../config/projectConfig';

/* 컬럼별 색 — 칸반 카드 PRI_COLOR와 별개로 상태 색 통일 */
const STATUS_COLOR = {
  todo:   '#94a3b8',
  doing:  '#4361ee',
  review: '#ff9f1c',
  done:   '#06d6a0',
};

export default function SituationStatusChart({ tasks }) {
  const total = tasks.length || 1; // 0 나누기 방지

  /* 컬럼별 카운트 */
  const counts = TASK_COLUMNS.map((col) => ({
    ...col,
    color: STATUS_COLOR[col.id] || '#94a3b8',
    count: tasks.filter((t) => t.status === col.id).length,
  }));

  return (
    <div className="psr-widget">
      <div className="psr-widget-head">
        <h4>
          <i className="fa-solid fa-chart-column" style={{ color: '#4361ee' }} />
          진행 상태 분포
        </h4>
        <span className="psr-widget-meta">{tasks.length}건</span>
      </div>

      {tasks.length === 0 ? (
        <div className="psr-empty">
          <i className="fa-regular fa-folder-open" />
          <p>아직 태스크가 없어요</p>
        </div>
      ) : (
        <>
          {/* 가로 누적 막대 */}
          <div className="psr-stacked-bar">
            {counts.map((c) =>
              c.count > 0 ? (
                <div
                  key={c.id}
                  className="psr-stacked-seg"
                  style={{
                    width: `${(c.count / total) * 100}%`,
                    background: c.color,
                  }}
                  title={`${c.title}: ${c.count}건`}
                >
                  {(c.count / total) >= 0.08 && (
                    <span className="psr-stacked-label">{c.count}</span>
                  )}
                </div>
              ) : null
            )}
          </div>

          {/* 범례 + 카운트 */}
          <div className="psr-legend">
            {counts.map((c) => (
              <div key={c.id} className="psr-legend-item">
                <span className="psr-legend-dot" style={{ background: c.color }} />
                <span className="psr-legend-label">{c.title}</span>
                <strong className="psr-legend-count">{c.count}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}