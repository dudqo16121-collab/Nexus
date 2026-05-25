// components/feedback/admin/SentimentTrend.jsx
// 12주 감정 트렌드 — stacked area 형태 (긍정/제안/중립/부정).

import { useFeedback } from '../../../contexts/FeedbackContext';
import { getSentimentMeta } from '../../../config/feedbackTypes';

const SENTIMENTS = ['positive', 'suggestion', 'neutral', 'negative'];

export default function SentimentTrend() {
  const { sentimentTrend } = useFeedback();

  const hasData = sentimentTrend.some((w) => w.total > 0);
  if (!hasData) {
    return (
      <div className="fb-chart-empty">
        <i className="fa-solid fa-chart-line" />
        <p>주간 추세를 표시할 데이터가 부족해요</p>
      </div>
    );
  }

  const W = 800, H = 220, PAD_L = 30, PAD_R = 20, PAD_T = 20, PAD_B = 30;
  const maxTotal = Math.max(...sentimentTrend.map((w) => w.total), 1);
  const xStep = (W - PAD_L - PAD_R) / Math.max(1, sentimentTrend.length - 1);

  // 누적 stacked area 계산
  const layers = {};
  SENTIMENTS.forEach((sent) => {
    layers[sent] = sentimentTrend.map((w, i) => {
      let stackBelow = 0;
      for (const s of SENTIMENTS) {
        if (s === sent) break;
        stackBelow += w[s] || 0;
      }
      const stackTop = stackBelow + (w[sent] || 0);
      const x = PAD_L + i * xStep;
      const yBottom = H - PAD_B - (stackBelow / maxTotal) * (H - PAD_T - PAD_B);
      const yTop = H - PAD_B - (stackTop / maxTotal) * (H - PAD_T - PAD_B);
      return { x, yBottom, yTop };
    });
  });

  const buildAreaPath = (sent) => {
    const pts = layers[sent];
    if (pts.length === 0) return '';
    const top = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yTop}`).join(' ');
    const bottom = [...pts].reverse().map((p) => `L ${p.x} ${p.yBottom}`).join(' ');
    return `${top} ${bottom} Z`;
  };

  return (
    <div className="fb-trend">
      <svg viewBox={`0 0 ${W} ${H}`} className="fb-trend-svg" preserveAspectRatio="xMidYMid meet">
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => {
          const y = H - PAD_B - v * (H - PAD_T - PAD_B);
          return (
            <g key={v}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border-color)" strokeDasharray="2 4" />
              <text x={PAD_L - 6} y={y + 3} fontSize="9" fill="var(--text-muted)" textAnchor="end">
                {Math.round(v * maxTotal)}
              </text>
            </g>
          );
        })}

        {/* stacked areas */}
        {SENTIMENTS.map((sent) => {
          const meta = getSentimentMeta(sent);
          return (
            <path
              key={sent}
              d={buildAreaPath(sent)}
              fill={meta.color}
              opacity="0.7"
              stroke={meta.color}
              strokeWidth="1"
            />
          );
        })}

        {/* x labels */}
        {sentimentTrend.map((w, i) => {
          if (i % 2 !== 0 && i !== sentimentTrend.length - 1) return null;
          const x = PAD_L + i * xStep;
          return (
            <text
              key={i}
              x={x} y={H - 8}
              fontSize="9"
              textAnchor="middle"
              fill="var(--text-muted)"
            >
              W{w.weekLabel}
            </text>
          );
        })}
      </svg>

      {/* 범례 */}
      <div className="fb-trend-legend">
        {SENTIMENTS.map((sent) => {
          const meta = getSentimentMeta(sent);
          return (
            <div key={sent} className="fb-trend-legend-item">
              <span className="fb-trend-dot" style={{ background: meta.color }} />
              {meta.emoji} {meta.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}