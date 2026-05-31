// components/hub/HubCheckinCard.jsx
// 일일 체크인 위젯 — Hub 페이지 상단에 위치.

import { useMemo } from 'react';
import { useHub, MOOD_OPTIONS, STREAK_MILESTONES } from '../../contexts/HubContext';

export default function HubCheckinCard() {
  const {
    todayCheckin,
    currentStreak,
    checkins,
    openCheckinModal,
  } = useHub();

  const isCheckedIn = !!todayCheckin;
  const todayMood = todayCheckin
    ? MOOD_OPTIONS.find((m) => m.value === todayCheckin.mood)
    : null;

  /* 다음 마일스톤 */
  const nextMilestone = STREAK_MILESTONES.find((m) => m > currentStreak);
  const progressPct = nextMilestone
    ? Math.min(100, (currentStreak / nextMilestone) * 100)
    : 100;

  /* 최근 7일 캘린더 시각화 */
  const last7Days = useMemo(() => {
    const days = [];
    const dateMap = new Map(checkins.map((c) => [c.checkin_date, c]));
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const checkin = dateMap.get(ds);
      days.push({
        date: ds,
        day: d.getDate(),
        weekday: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
        isToday: i === 0,
        checkin,
      });
    }
    return days;
  }, [checkins]);

  return (
    <section className="hub-checkin-card">
      <div className="hub-checkin-card-main">
        <div className="hub-checkin-card-left">
          <div className="hub-checkin-card-header">
            <span className="hub-checkin-card-fire">🔥</span>
            <div>
              <div className="hub-checkin-card-streak">
                <strong>{currentStreak}</strong>
                <span>일 연속 출석</span>
              </div>
              {nextMilestone ? (
                <div className="hub-checkin-card-next">
                  {nextMilestone}일까지 <strong>{nextMilestone - currentStreak}일</strong> 남았어요
                </div>
              ) : (
                <div className="hub-checkin-card-next">
                  🏆 모든 마일스톤 달성!
                </div>
              )}
            </div>
          </div>

          {/* 진행 바 */}
          {nextMilestone && (
            <div className="hub-checkin-progress">
              <div className="hub-checkin-progress-track">
                <div
                  className="hub-checkin-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="hub-checkin-progress-milestones">
                {STREAK_MILESTONES.map((m) => (
                  <span
                    key={m}
                    className={`hub-checkin-milestone-tick ${currentStreak >= m ? 'reached' : ''}`}
                    style={{ left: `${Math.min(100, (m / (nextMilestone || 30)) * 100)}%` }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 최근 7일 캘린더 */}
          <div className="hub-checkin-week">
            {last7Days.map((d) => {
              const dMood = d.checkin
                ? MOOD_OPTIONS.find((m) => m.value === d.checkin.mood)
                : null;
              return (
                <div
                  key={d.date}
                  className={`hub-checkin-day ${d.isToday ? 'today' : ''} ${d.checkin ? 'checked' : ''}`}
                  title={d.checkin ? `${d.date} - ${dMood?.label}` : d.date}
                >
                  <div className="hub-checkin-day-weekday">{d.weekday}</div>
                  <div
                    className="hub-checkin-day-circle"
                    style={d.checkin && dMood ? { background: dMood.color, color: '#fff' } : undefined}
                  >
                    {d.checkin ? dMood?.emoji : d.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측 — 체크인 버튼 */}
        <div className="hub-checkin-card-action">
          {isCheckedIn ? (
            <button
              type="button"
              className="hub-checkin-cta done"
              onClick={openCheckinModal}
            >
              <div className="hub-checkin-cta-icon">
                <span style={{ fontSize: '2.2rem' }}>{todayMood?.emoji}</span>
              </div>
              <div className="hub-checkin-cta-text">
                <strong>오늘 체크인 완료</strong>
                <span>+{todayCheckin.points_earned}P 적립</span>
              </div>
              <i className="fa-solid fa-pen hub-checkin-cta-edit" />
            </button>
          ) : (
            <button
              type="button"
              className="hub-checkin-cta primary"
              onClick={openCheckinModal}
            >
              <div className="hub-checkin-cta-icon">
                <i className="fa-solid fa-hand-sparkles" />
              </div>
              <div className="hub-checkin-cta-text">
                <strong>오늘 체크인하기</strong>
                <span>+{(currentStreak + 1) * 5}P</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}