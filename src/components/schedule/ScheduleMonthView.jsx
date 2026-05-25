// 월 뷰 — 6주 × 7일 그리드. 각 셀에 그 날짜의 이벤트 표시 (최대 3개 + "+N").

import { useSchedule } from '../../contexts/ScheduleContext';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/* 이벤트가 특정 날짜에 표시되어야 하는가 — start_at ~ end_at 범위에 포함되는지 */
function eventOnDate(event, dateStr) {
  const s = event.start_at?.substring(0, 10);
  const e = (event.end_at || event.start_at)?.substring(0, 10);
  return s && s <= dateStr && dateStr <= e;
}

export default function ScheduleMonthView() {
  const {
    currentDate,
    filteredEvents,
    openCreateModal,
    openEditModal,
  } = useSchedule();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  /* 6주 × 7일 = 42 셀. 이전/현재/다음 달 날짜 포함. */
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), outside: false });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ date: next, outside: true });
  }

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

  return (
    <div className="schedule-month-view">
      <div className="schedule-month-header">
        {DAY_NAMES.map((n, i) => (
          <div
            key={n}
            className="schedule-month-dayname"
            style={{
              color: i === 0 ? 'var(--danger)' : i === 6 ? 'var(--primary-color)' : 'var(--text-muted)',
            }}
          >
            {n}
          </div>
        ))}
      </div>

      <div className="schedule-month-grid">
        {cells.map(({ date, outside }, i) => {
          const dStr = dateKey(date);
          const dayEvents = filteredEvents.filter((e) => eventOnDate(e, dStr));
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          const dayOfWeek = date.getDay();

          return (
            <div
              key={i}
              className={`schedule-month-cell ${outside ? 'outside' : ''} ${isToday(date) ? 'today' : ''}`}
              onClick={() => openCreateModal(date)}
            >
              <div
                className="schedule-month-date"
                style={{
                  color: outside
                    ? 'var(--text-muted)'
                    : dayOfWeek === 0
                      ? 'var(--danger)'
                      : dayOfWeek === 6
                        ? 'var(--primary-color)'
                        : 'var(--text-main)',
                }}
              >
                {date.getDate()}
              </div>

              <div className="schedule-month-events">
                {visible.map((ev) => (
                  <div
                    key={ev.id}
                    className="schedule-event-pill"
                    style={{ background: ev.color || '#4361ee' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(ev);
                    }}
                    title={ev.title}
                  >
                    {!ev.all_day && (
                      <span className="schedule-event-time">
                        {new Date(ev.start_at).getHours().toString().padStart(2, '0')}:
                        {new Date(ev.start_at).getMinutes().toString().padStart(2, '0')}
                      </span>
                    )}
                    <span>{ev.title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="schedule-event-more">+{overflow}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}