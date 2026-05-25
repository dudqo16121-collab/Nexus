// 일 뷰 — 하루의 24시간 타임라인을 크게.

import { useSchedule } from '../../contexts/ScheduleContext';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ScheduleDayView() {
  const { currentDate, filteredEvents, openCreateModal, openEditModal } = useSchedule();

  const dateKey = (() => {
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return `${currentDate.getFullYear()}-${m}-${d}`;
  })();

  const dayEvents = filteredEvents.filter((e) => {
    const s = e.start_at?.substring(0, 10);
    const eEnd = (e.end_at || e.start_at)?.substring(0, 10);
    return s && s <= dateKey && dateKey <= eEnd;
  });
  const alldayEvents = dayEvents.filter((e) => e.all_day);
  const timedEvents = dayEvents.filter((e) => !e.all_day);

  const handleSlotClick = (hour) => {
    const target = new Date(currentDate);
    target.setHours(hour, 0, 0, 0);
    openCreateModal(target);
  };

  return (
    <div className="schedule-day-view">
      {alldayEvents.length > 0 && (
        <div className="schedule-day-allday">
          <div className="schedule-day-allday-label">종일</div>
          <div className="schedule-day-allday-list">
            {alldayEvents.map((ev) => (
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
        </div>
      )}

      <div className="schedule-day-grid">
        <div className="schedule-day-time-col">
          {HOURS.map((h) => (
            <div key={h} className="schedule-day-time-label">
              {h.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        <div className="schedule-day-content">
          {HOURS.map((h) => (
            <div
              key={h}
              className="schedule-day-slot"
              onClick={() => handleSlotClick(h)}
            />
          ))}

          {/* 이벤트 오버레이 */}
          {timedEvents.map((ev) => {
            const start = new Date(ev.start_at);
            const end = new Date(ev.end_at || ev.start_at);
            const top = (start.getHours() + start.getMinutes() / 60) * 60;
            const durMin = Math.max(30, (end - start) / 60000);
            const height = (durMin / 60) * 60;
            return (
              <div
                key={ev.id}
                className="schedule-day-event"
                style={{
                  background: ev.color || '#4361ee',
                  top,
                  height,
                }}
                onClick={() => openEditModal(ev)}
              >
                <strong>{ev.title}</strong>
                <span>
                  {start.getHours().toString().padStart(2, '0')}:{start.getMinutes().toString().padStart(2, '0')}
                  {' - '}
                  {end.getHours().toString().padStart(2, '0')}:{end.getMinutes().toString().padStart(2, '0')}
                </span>
                {ev.description && <p>{ev.description}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}