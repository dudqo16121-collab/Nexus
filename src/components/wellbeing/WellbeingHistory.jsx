// 내 기록 탭 — 히트맵 + 최근 기록 카드 + 인사이트.

import { useWellbeing } from '../../contexts/WellbeingContext';

function moodColor(score) {
  if (score >= 9) return '#06d6a0';
  if (score >= 7) return '#4cc9f0';
  if (score >= 5) return '#ffd166';
  if (score >= 3) return '#ff9f1c';
  return '#f72585';
}

export default function WellbeingHistory() {
  const { myCheckins, streak, myAvg, insights, MOODS } = useWellbeing();

  /* 30일 히트맵 */
  const heatmap = (() => {
    const map = new Map(myCheckins.map((c) => [c.check_date, c]));
    const cells = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      cells.push({ date: k, day: d.getDate(), checkin: map.get(k) || null });
    }
    return cells;
  })();

  return (
    <div className="wb-history">
      {/* 상단 요약 */}
      <div className="wb-history-summary">
        <div className="wb-summary-card">
          <div className="wb-summary-num">{streak}</div>
          <div className="wb-summary-label">🔥 연속 체크인</div>
        </div>
        <div className="wb-summary-card">
          <div className="wb-summary-num">{myCheckins.length}</div>
          <div className="wb-summary-label">📊 총 체크인 횟수</div>
        </div>
        <div className="wb-summary-card">
          <div className="wb-summary-num">
            {myAvg ? myAvg.mood.toFixed(1) : '-'}
          </div>
          <div className="wb-summary-label">😊 최근 7일 평균 기분</div>
        </div>
      </div>

      {/* 인사이트 */}
      {insights.length > 0 && (
        <section className="wb-card">
          <header className="wb-card-head">
            <h3><i className="fa-solid fa-lightbulb" /> 인사이트</h3>
          </header>
          <div className="wb-card-body">
            <div className="wb-insights">
              {insights.map((ins, i) => (
                <div key={i} className="wb-insight">
                  <div className="wb-insight-icon">{ins.icon}</div>
                  <div>
                    <strong>{ins.title}</strong>
                    <p>{ins.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 30일 히트맵 */}
      <section className="wb-card">
        <header className="wb-card-head">
          <h3><i className="fa-solid fa-calendar" /> 최근 30일</h3>
        </header>
        <div className="wb-card-body">
          <div className="wb-heatmap">
            {heatmap.map((cell) => {
              const c = cell.checkin;
              const color = c ? moodColor(c.mood_score) : null;
              return (
                <div
                  key={cell.date}
                  className="wb-heatmap-cell"
                  style={{
                    background: color || 'var(--hover-bg)',
                    opacity: c ? 1 : 0.4,
                  }}
                  title={c ? `${cell.date} — ${c.mood_label || ''}` : cell.date}
                >
                  <span>{cell.day}</span>
                </div>
              );
            })}
          </div>
          <div className="wb-heatmap-legend">
            <span>낮음</span>
            <div className="wb-heatmap-cell" style={{ background: '#f72585' }} />
            <div className="wb-heatmap-cell" style={{ background: '#ff9f1c' }} />
            <div className="wb-heatmap-cell" style={{ background: '#ffd166' }} />
            <div className="wb-heatmap-cell" style={{ background: '#4cc9f0' }} />
            <div className="wb-heatmap-cell" style={{ background: '#06d6a0' }} />
            <span>높음</span>
          </div>
        </div>
      </section>

      {/* 최근 기록 카드 리스트 */}
      <section className="wb-card">
        <header className="wb-card-head">
          <h3><i className="fa-solid fa-list" /> 최근 기록</h3>
        </header>
        <div className="wb-card-body">
          {myCheckins.length === 0 ? (
            <div className="wb-empty">
              <i className="fa-regular fa-face-smile" />
              <p>아직 기록이 없어요</p>
              <span>오늘 첫 체크인을 시작해보세요!</span>
            </div>
          ) : (
            <div className="wb-record-list">
              {myCheckins.slice(0, 10).map((c) => {
                const mood = MOODS.find((m) => m.score === c.mood_score) || MOODS[2];
                return (
                  <div key={c.id} className="wb-record">
                    <div className="wb-record-em">{mood.em}</div>
                    <div className="wb-record-body">
                      <div className="wb-record-line1">
                        <strong>{c.check_date}</strong>
                        <span style={{ color: mood.color }}>{mood.label}</span>
                      </div>
                      <div className="wb-record-stats">
                        <span>⚡ {c.energy}</span>
                        <span>🔥 {c.burnout}</span>
                        <span>🎯 {c.focus}</span>
                      </div>
                      {c.tags?.length > 0 && (
                        <div className="wb-record-tags">
                          {c.tags.map((t) => <span key={t}>{t}</span>)}
                        </div>
                      )}
                      {c.note && <p className="wb-record-note">"{c.note}"</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}