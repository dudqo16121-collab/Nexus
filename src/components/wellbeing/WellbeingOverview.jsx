// 전사 현황 탭 — 오늘 KPI + 부서별 카드 + 7일 트렌드 라인.

import { useWellbeing } from '../../contexts/WellbeingContext';

function moodEmoji(score) {
  if (score >= 9) return '😄';
  if (score >= 7) return '😊';
  if (score >= 5) return '😐';
  if (score >= 3) return '😔';
  return '😞';
}

export default function WellbeingOverview() {
  const { todayStats, deptStats, trend7 } = useWellbeing();

  return (
    <div className="wb-overview">
      {/* KPI */}
      <div className="wb-kpi-grid">
        <KpiCard
          icon="fa-users"
          color="#4361ee"
          label="오늘 체크인"
          value={`${todayStats.count}명`}
        />
        <KpiCard
          icon="fa-face-smile"
          color="#06d6a0"
          label="평균 기분"
          value={`${moodEmoji(todayStats.avgMood)} ${todayStats.avgMood.toFixed(1)}`}
        />
        <KpiCard
          icon="fa-bolt"
          color="#ffd166"
          label="평균 에너지"
          value={`${todayStats.avgEnergy.toFixed(1)} / 10`}
        />
        <KpiCard
          icon="fa-fire"
          color="#f72585"
          label="평균 번아웃"
          value={`${todayStats.avgBurnout.toFixed(1)} / 10`}
          warning={todayStats.avgBurnout >= 6}
        />
      </div>

      {/* 7일 트렌드 (SVG 라인 차트) */}
      <section className="wb-card">
        <header className="wb-card-head">
          <h3><i className="fa-solid fa-chart-line" /> 최근 7일 Well-being 점수</h3>
        </header>
        <div className="wb-card-body">
          <TrendChart data={trend7} />
        </div>
      </section>

      {/* 부서별 카드 그리드 */}
      <section className="wb-card">
        <header className="wb-card-head">
          <h3><i className="fa-solid fa-building" /> 부서별 평균</h3>
          <span className="wb-card-sub">최근 90일 기준</span>
        </header>
        <div className="wb-card-body">
          {deptStats.length === 0 ? (
            <div className="wb-empty">아직 데이터가 없어요</div>
          ) : (
            <div className="wb-dept-grid">
              {deptStats.map((d) => (
                <div key={d.dept} className="wb-dept-card">
                  <div className="wb-dept-head">
                    <strong>{d.dept}</strong>
                    <span>{d.count}건</span>
                  </div>
                  <div className="wb-dept-score" style={{ color: d.avgBurnout >= 6 ? 'var(--danger)' : '#06d6a0' }}>
                    {d.score}
                  </div>
                  <div className="wb-dept-stats">
                    <span>기분 {d.avgMood.toFixed(1)}</span>
                    <span>에너지 {d.avgEnergy.toFixed(1)}</span>
                    <span>번아웃 {d.avgBurnout.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon, color, label, value, warning }) {
  return (
    <div className={`wb-kpi ${warning ? 'warning' : ''}`}>
      <div className="wb-kpi-icon" style={{ background: `${color}15`, color }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="wb-kpi-body">
        <div className="wb-kpi-label">{label}</div>
        <div className="wb-kpi-value">{value}</div>
      </div>
    </div>
  );
}

/* SVG 라인 차트 */
function TrendChart({ data }) {
  const valid = data.filter((d) => d.score !== null);
  if (valid.length === 0) {
    return <div className="wb-empty" style={{ padding: 40 }}>아직 데이터가 없어요</div>;
  }
  const W = 800, H = 200, PAD = 30;
  const ys = data.map((d) => d.score ?? 0);
  const max = 10, min = 0;
  const xStep = (W - PAD * 2) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = PAD + i * xStep;
    const y = d.score == null
      ? null
      : H - PAD - ((d.score - min) / (max - min)) * (H - PAD * 2);
    return { x, y, d };
  });
  const pathD = points
    .filter((p) => p.y !== null)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="wb-trend-svg" preserveAspectRatio="xMidYMid meet">
      {/* grid lines */}
      {[0, 2.5, 5, 7.5, 10].map((v) => {
        const y = H - PAD - (v / 10) * (H - PAD * 2);
        return (
          <g key={v}>
            <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="var(--border-color)" strokeDasharray="2 4" />
            <text x={4} y={y + 3} fontSize="10" fill="var(--text-muted)">{v}</text>
          </g>
        );
      })}
      {/* path */}
      <path d={pathD} fill="none" stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* fill under */}
      {pathD && (
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${H - PAD} L ${PAD} ${H - PAD} Z`}
          fill="var(--primary-color)"
          opacity="0.08"
        />
      )}
      {/* points */}
      {points.map((p, i) => p.y !== null && (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="var(--primary-color)" strokeWidth="2" />
          <text x={p.x} y={H - 8} fontSize="10" textAnchor="middle" fill="var(--text-muted)">
            {p.d.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}