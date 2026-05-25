// components/expenses/ExpenseCategoryChart.jsx
// 카테고리별 이번달 지출 도넛 차트 — 원본 renderExpenseCategoryChart 이관.
// 원본은 Chart.js 도넛이었으나, 의존성 없이 순수 SVG stroke-dasharray 로 구현.
// 다크모드는 CSS 변수로 자동 대응 → 원본의 bindExpenseDarkModeRefresh 불필요.

import { useExpense } from '../../contexts/ExpenseContext';
import { catColor, fmtKRW } from '../../config/expenseTypes';

/* 도넛 기하 — viewBox 100x100, 반지름 r, 둘레 = 2πr */
const R = 38;
const CIRC = 2 * Math.PI * R;
const STROKE = 16;

export default function ExpenseCategoryChart() {
  const { categoryBreakdown, loading } = useExpense();

  const total = categoryBreakdown.reduce((s, d) => s + d.amount, 0);

  /* 빈 상태 — 원본의 "이번 달 지출 내역이 없습니다" 캔버스 대응 */
  if (loading || categoryBreakdown.length === 0 || total === 0) {
    return (
      <div
        style={{
          position: 'relative',
          height: 260,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}
      >
        {loading ? '불러오는 중...' : '이번 달 지출 내역이 없습니다.'}
      </div>
    );
  }

  /* 각 세그먼트의 dash offset 누적 계산 */
  let acc = 0;
  const segments = categoryBreakdown.map((d) => {
    const frac = d.amount / total;
    const seg = {
      ...d,
      color: catColor(d.category),
      pct: frac * 100,
      dash: frac * CIRC,
      gap: CIRC - frac * CIRC,
      offset: -acc * CIRC,
    };
    acc += frac;
    return seg;
  });

  return (
    <div
      style={{
        position: 'relative',
        height: 260,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {/* 도넛 SVG */}
      <svg
        viewBox="0 0 100 100"
        style={{ width: 180, height: 180, flexShrink: 0 }}
      >
        {/* 트랙 */}
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={STROKE}
          opacity="0.35"
        />
        {/* 세그먼트 — 12시 방향부터 시계방향 */}
        <g transform="rotate(-90 50 50)">
          {segments.map((s) => (
            <circle
              key={s.category}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
            >
              <title>
                {s.category}: {fmtKRW(s.amount)} ({s.pct.toFixed(1)}%)
              </title>
            </circle>
          ))}
        </g>
        {/* 중앙 합계 */}
        <text
          x="50"
          y="47"
          textAnchor="middle"
          style={{ fontSize: 6, fill: 'var(--text-muted)' }}
        >
          이번달 합계
        </text>
        <text
          x="50"
          y="56"
          textAnchor="middle"
          style={{ fontSize: 7, fontWeight: 800, fill: 'var(--text-main)' }}
        >
          {fmtKRW(total)}
        </text>
      </svg>

      {/* 범례 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minWidth: 0,
          maxHeight: 240,
          overflowY: 'auto',
        }}
      >
        {segments.map((s) => (
          <div
            key={s.category}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.category}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {fmtKRW(s.amount)}
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                width: 44,
                textAlign: 'right',
              }}
            >
              {s.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
