// components/feedback/admin/DeptSignal.jsx
// 부서별 신호 (N>=5만 표시). 분포 + 무드 판정.

import { useFeedback } from '../../../contexts/FeedbackContext';
import { ANONYMITY_THRESHOLD } from '../../../config/feedbackTypes';

export default function DeptSignal() {
  const { deptSignal, feedbacks } = useFeedback();

  // 부서 정보가 있지만 5개 미만으로 가려진 부서 카운트 (안내용)
  const hiddenCount = (() => {
    const map = {};
    feedbacks.forEach((f) => {
      if (!f.dept_bucket) return;
      map[f.dept_bucket] = (map[f.dept_bucket] || 0) + 1;
    });
    return Object.values(map).filter((c) => c > 0 && c < ANONYMITY_THRESHOLD).length;
  })();

  if (deptSignal.length === 0) {
    return (
      <div className="fb-chart-empty">
        <i className="fa-solid fa-users" />
        <p>표시할 부서 데이터가 없어요</p>
        <small>
          익명성 보호를 위해 {ANONYMITY_THRESHOLD}건 이상 누적된 부서만 표시됩니다.
          {hiddenCount > 0 && ` (현재 ${hiddenCount}개 부서가 가려져 있어요)`}
        </small>
      </div>
    );
  }

  return (
    <div className="fb-dept-signal">
      <div className="fb-dept-signal-note">
        <i className="fa-solid fa-shield-halved" />
        익명성 보호 — {ANONYMITY_THRESHOLD}건 이상 누적된 부서만 표시
        {hiddenCount > 0 && <span> · {hiddenCount}개 부서 비공개</span>}
      </div>

      <div className="fb-dept-list">
        {deptSignal.map((d) => {
          // 가로 막대용 비율
          const total = d.total;
          const segments = [
            { sent: 'positive',   value: d.positive,   color: '#06d6a0' },
            { sent: 'suggestion', value: d.suggestion, color: '#4361ee' },
            { sent: 'neutral',    value: d.neutral,    color: '#94a3b8' },
            { sent: 'negative',   value: d.negative,   color: '#f72585' },
          ];

          const moodColor = d.positivity > 0.2 ? '#06d6a0' : d.positivity < -0.2 ? '#f72585' : '#94a3b8';
          const moodEmoji = d.positivity > 0.2 ? '😊' : d.positivity < -0.2 ? '😔' : '😐';

          return (
            <div key={d.dept} className="fb-dept-row">
              <div className="fb-dept-row-head">
                <div>
                  <strong>{d.dept}</strong>
                  <span className="fb-dept-total">{d.total}건</span>
                </div>
                <div className="fb-dept-mood" style={{ color: moodColor }}>
                  <span>{moodEmoji}</span> {d.mood}
                </div>
              </div>

              <div className="fb-dept-bar">
                {segments.map((s) => {
                  const pct = (s.value / total) * 100;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={s.sent}
                      className="fb-dept-bar-seg"
                      style={{ width: `${pct}%`, background: s.color }}
                      title={`${s.sent}: ${s.value}건`}
                    />
                  );
                })}
              </div>

              <div className="fb-dept-bar-meta">
                {segments.filter((s) => s.value > 0).map((s) => (
                  <span key={s.sent} style={{ color: s.color }}>
                    ● {s.value}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}