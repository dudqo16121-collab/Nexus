// components/pulse/PulseSurveyResults.jsx
// 설문 결과 — 척도(분포 막대) / 객관식(가로 막대) / 자유서술(목록).

import { usePulse } from '../../contexts/PulseContext';

export default function PulseSurveyResults({ survey, onClose }) {
  const { aggregateSurvey, ANONYMITY_THRESHOLD } = usePulse();
  const agg = aggregateSurvey(survey.id);

  if (!agg) return null;

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div
        className="ps-modal ps-modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <header className="ps-modal-head">
          <div>
            <h2>📊 {survey.title} — 결과</h2>
            <p>총 응답 {agg.total}건</p>
          </div>
          <button type="button" className="ps-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        {agg.total < ANONYMITY_THRESHOLD ? (
          <div className="ps-modal-body">
            <div className="ps-empty">
              <i className="fa-solid fa-shield-halved" />
              <p>응답 {ANONYMITY_THRESHOLD}건 이상 모일 때까지 결과를 볼 수 없어요</p>
              <small>익명성 보호를 위한 정책이에요. 현재 {agg.total}건 수집됨.</small>
            </div>
          </div>
        ) : (
          <div className="ps-modal-body">
            {(survey.questions || []).map((q, idx) => {
              const data = agg.byQuestion[q.id];
              if (!data) return null;
              return (
                <div key={q.id} className="ps-result-block">
                  <h4 className="ps-result-title">
                    Q{idx + 1}. {q.label}
                  </h4>

                  {data.type === 'scale' && <ScaleResult data={data} question={q} />}
                  {data.type === 'choice' && <ChoiceResult data={data} />}
                  {data.type === 'text' && <TextResult data={data} />}
                </div>
              );
            })}

            {agg.deptAggregates.length > 0 && (
              <div className="ps-result-block">
                <h4 className="ps-result-title">
                  🏢 부서별 응답 ({agg.deptAggregates.length}개 부서, N≥{ANONYMITY_THRESHOLD})
                </h4>
                <div className="ps-dept-pill-row">
                  {agg.deptAggregates.map((d) => (
                    <span key={d.dept} className="ps-dept-pill">
                      {d.dept} <strong>{d.count}</strong>
                    </span>
                  ))}
                </div>
                {agg.hiddenDeptCount > 0 && (
                  <p className="ps-dept-note">
                    🔒 {agg.hiddenDeptCount}개 부서는 응답이 적어 비공개
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <footer className="ps-modal-foot">
          <button type="button" className="ps-btn-primary" onClick={onClose}>
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─── 척도 결과: 평균 + 분포 막대 ─────────────────────── */
function ScaleResult({ data, question }) {
  const min = question.scale_min ?? 1;
  const max = question.scale_max ?? 10;
  const buckets = [];
  for (let i = min; i <= max; i++) buckets.push(i);
  const maxCount = Math.max(...Object.values(data.distribution || {}), 1);

  return (
    <div className="ps-scale-result">
      <div className="ps-scale-summary">
        <div>
          <span className="ps-stat-label">평균</span>
          <strong className="ps-stat-value">{data.avg.toFixed(1)}</strong>
        </div>
        <div>
          <span className="ps-stat-label">응답</span>
          <strong className="ps-stat-value">{data.count}</strong>
        </div>
      </div>
      <div className="ps-scale-distribution">
        {buckets.map((n) => {
          const c = data.distribution?.[n] || 0;
          const h = (c / maxCount) * 100;
          return (
            <div key={n} className="ps-scale-bar-col">
              <div className="ps-scale-bar-wrap">
                <div
                  className="ps-scale-bar"
                  style={{ height: `${h}%` }}
                  title={`${n}점: ${c}명`}
                />
              </div>
              <div className="ps-scale-bar-num">{n}</div>
              <div className="ps-scale-bar-cnt">{c}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 객관식 결과: 가로 막대 ───────────────────────────── */
function ChoiceResult({ data }) {
  const entries = Object.entries(data.counts || {}).sort((a, b) => b[1] - a[1]);
  const total = data.total || 1;

  return (
    <div className="ps-choice-result">
      {entries.map(([opt, count]) => {
        const pct = (count / total) * 100;
        return (
          <div key={opt} className="ps-choice-bar-row">
            <div className="ps-choice-bar-label">{opt}</div>
            <div className="ps-choice-bar-track">
              <div
                className="ps-choice-bar-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="ps-choice-bar-count">
              <strong>{count}</strong> <span>({pct.toFixed(0)}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── 자유서술 결과: 목록 ──────────────────────────────── */
function TextResult({ data }) {
  if (data.count === 0) {
    return <p className="ps-empty-small">자유서술 응답이 없어요</p>;
  }
  return (
    <div className="ps-text-result">
      <p className="ps-text-result-count">{data.count}개의 자유서술 응답</p>
      <div className="ps-text-list">
        {data.texts.map((t, i) => (
          <div key={i} className="ps-text-item">
            <i className="fa-solid fa-quote-left" />
            <p>{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}