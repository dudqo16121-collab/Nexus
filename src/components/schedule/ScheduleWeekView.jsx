// 주 뷰 — 7일 × 24시간 타임라인. 시간 슬롯 클릭 시 새 일정 모달.

import { useSchedule } from '../../contexts/ScheduleContext';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ScheduleWeekView() {
  const { currentDate, filteredEvents, openCreateModal, openEditModal } = useSchedule();

  /* 이번 주의 일요일 ~ 토요일 */
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const today = new Date();
  const isToday = (d) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const dateKey = (d) => {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };

  /* 셀 클릭 — 그 시간으로 새 일정 모달 */
  const handleSlotClick = (day, hour) => {
    const target = new Date(day);
    target.setHours(hour, 0, 0, 0);
    openCreateModal(target);
  };

  /* 특정 날짜의 시간별 이벤트 */
  const eventsForDay = (d) => {
    const k = dateKey(d);
    return filteredEvents.filter((e) => {
      const s = e.start_at?.substring(0, 10);
      const eEnd = (e.end_at || e.start_at)?.substring(0, 10);
      return s && s <= k && k <= eEnd;
    });
  };

  return (
    <div className="schedule-week-view">
      {/* 요일 헤더 */}
      <div className="schedule-week-header">
        <div className="schedule-week-time-col-header" />
        {days.map((d, i) => (
          <div
            key={i}
            className={`schedule-week-day-header ${isToday(d) ? 'today' : ''}`}
            style={{
              color: i === 0 ? 'var(--danger)' : i === 6 ? 'var(--primary-color)' : 'var(--text-main)',
            }}
          >
            <div className="schedule-week-dayname">{DAY_NAMES[i]}</div>
            <div className="schedule-week-date">{d.getDate()}</div>
          </div>
        ))}
      </div>

      {/* 종일 이벤트 영역 */}
      <div className="schedule-week-allday">
        <div className="schedule-week-allday-label">종일</div>
        {days.map((d, i) => {
          const dayEvents = eventsForDay(d).filter((e) => e.all_day);
          return (
            <div key={i} className="schedule-week-allday-cell">
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="schedule-event-pill"
                  style={{ background: ev.color || '#4361ee' }}
                  onClick={() => openEditModal(ev)}
                >
                  {ev.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* 시간 그리드 */}
      <div className="schedule-week-grid">
        <div className="schedule-week-time-col">
          {HOURS.map((h) => (
            <div key={h} className="schedule-week-time-label">
              {h.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {days.map((d, di) => (
          <div key={di} className="schedule-week-day-col">
            {HOURS.map((h) => (
              <div
                key={h}
                className="schedule-week-slot"
                onClick={() => handleSlotClick(d, h)}
              >
                {/* 이 시간에 시작하는 이벤트 */}
                {eventsForDay(d)
                  .filter((e) => !e.all_day && new Date(e.start_at).getHours() === h && dateKey(new Date(e.start_at)) === dateKey(d))
                  .map((ev) => {
                    const start = new Date(ev.start_at);
                    const end = new Date(ev.end_at || ev.start_at);
                    const durMin = Math.max(30, (end - start) / 60000);
                    const heightPx = (durMin / 60) * 48; /* 슬롯 1시간 = 48px */
                    return (
                      <div
                        key={ev.id}
                        className="schedule-event-block"
                        style={{
                          background: ev.color || '#4361ee',
                          height: heightPx,
                          top: (start.getMinutes() / 60) * 48,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(ev);
                        }}
                      >
                        <strong>{ev.title}</strong>
                        <span className="schedule-event-block-time">
                          {start.getHours().toString().padStart(2, '0')}:{start.getMinutes().toString().padStart(2, '0')}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}