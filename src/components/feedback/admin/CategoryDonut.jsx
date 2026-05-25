// components/feedback/admin/CategoryDonut.jsx
// 카테고리별 도넛 차트 — 순수 SVG.

import { useFeedback } from '../../../contexts/FeedbackContext';
import { getCategoryMeta } from '../../../config/feedbackTypes';

const R = 38;
const CIRC = 2 * Math.PI * R;
const STROKE = 16;

export default function CategoryDonut() {
  const { categoryStats } = useFeedback();
  const total = categoryStats.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="fb-chart-empty">
        <i className="fa-solid fa-chart-pie" />
        <p>아직 피드백이 없어요</p>
      </div>
    );
  }

  let acc = 0;
  const segments = categoryStats.map((d) => {
    const meta = getCategoryMeta(d.category);
    const frac = d.count / total;
    const seg = {
      ...d,
      ...meta,
      pct: frac * 100,
      dash: frac * CIRC,
      gap: CIRC - frac * CIRC,
      offset: -acc * CIRC,
    };
    acc += frac;
    return seg;
  });

  return (
    <div className="fb-donut-wrap">
      <svg viewBox="0 0 100 100" className="fb-donut-svg">
        <circle
          cx="50" cy="50" r={R}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={STROKE}
          opacity="0.35"
        />
        <g transform="rotate(-90 50 50)">
          {segments.map((s) => (
            <circle
              key={s.category}
              cx="50" cy="50" r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          ))}
        </g>
        <text x="50" y="48" textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontWeight="600">
          전체
        </text>
        <text x="50" y="60" textAnchor="middle" fontSize="14" fill="var(--text-main)" fontWeight="800">
          {total}
        </text>
      </svg>

      <div className="fb-donut-legend">
        {segments.map((s) => (
          <div key={s.category} className="fb-donut-legend-item">
            <span className="fb-donut-dot" style={{ background: s.color }} />
            <span className="fb-donut-label">{s.emoji} {s.label}</span>
            <span className="fb-donut-count">{s.count}</span>
            <span className="fb-donut-pct">{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}