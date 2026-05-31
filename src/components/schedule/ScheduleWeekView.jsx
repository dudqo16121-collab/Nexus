// 주 뷰 — 7일 × 24시간 타임라인. 드래그앤드롭으로 일정 이동 지원.

import { useSchedule } from '../../contexts/ScheduleContext';
import { useScheduleDnd } from '../../contexts/ScheduleDndContext';
import { calculateMovedDates, isSameDateTime } from './scheduleDndUtils';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ScheduleWeekView() {
  const {
    currentDate,
    filteredEvents,
    openCreateModal,
    openEditModal,
    canEdit,
  } = useSchedule();

  const {
    draggingEvent,
    dropTarget,
    startDrag,
    endDrag,
    updateDropTarget,
    openConfirm,
  } = useScheduleDnd();

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

  const handleSlotClick = (day, hour) => {
    const target = new Date(day);
    target.setHours(hour, 0, 0, 0);
    openCreateModal(target);
  };

  const eventsForDay = (d) => {
    const k = dateKey(d);
    return filteredEvents.filter((e) => {
      const s = e.start_at?.substring(0, 10);
      const eEnd = (e.end_at || e.start_at)?.substring(0, 10);
      return s && s <= k && k <= eEnd;
    });
  };

  /* ─── 드래그 핸들러 ─── */
  const handleDragStart = (e, event) => {
    if (!canEdit(event)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
    startDrag(event);
  };

  const handleDragEnd = () => {
    endDrag();
  };

  const handleSlotDragOver = (e, day, hour) => {
    if (!draggingEvent) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const targetDate = new Date(day);
    targetDate.setHours(hour, 0, 0, 0);
    
    if (!dropTarget || !isSameDateTime(dropTarget.date, targetDate.toISOString())) {
      updateDropTarget({ date: targetDate.toISOString(), hour });
    }
  };

  const handleSlotDrop = (e, day, hour) => {
    e.preventDefault();
    if (!draggingEvent) return;

    const targetDate = new Date(day);
    targetDate.setHours(hour, 0, 0, 0);

    /* 같은 시간이면 의미 없음 */
    if (isSameDateTime(targetDate.toISOString(), draggingEvent.start_at)) {
      endDrag();
      return;
    }

    /* 시간까지 새로 설정 */
    const { newStartAt, newEndAt } = calculateMovedDates(draggingEvent, targetDate, true);
    openConfirm(draggingEvent, newStartAt, newEndAt);
    endDrag();
  };

  /* 종일 영역 드롭 */
  const handleAllDayDrop = (e, day) => {
    e.preventDefault();
    if (!draggingEvent) return;

    /* 종일 영역에 드롭 — 시간 보존하고 날짜만 변경 */
    const { newStartAt, newEndAt } = calculateMovedDates(draggingEvent, day, false);
    openConfirm(draggingEvent, newStartAt, newEndAt);
    endDrag();
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
            <div
              key={i}
              className="schedule-week-allday-cell"
              onDragOver={(e) => {
                if (!draggingEvent) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => handleAllDayDrop(e, d)}
            >
              {dayEvents.map((ev) => {
                const isDragging = draggingEvent?.id === ev.id;
                const isEditable = canEdit(ev);
                return (
                  <div
                    key={ev.id}
                    className={`schedule-event-pill ${isDragging ? 'dragging' : ''} ${isEditable ? 'draggable' : ''}`}
                    style={{ background: ev.color || '#4361ee' }}
                    draggable={isEditable}
                    onDragStart={(e) => handleDragStart(e, ev)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openEditModal(ev)}
                  >
                    {ev.title}
                  </div>
                );
              })}
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

        {days.map((day, dIdx) => (
          <div key={dIdx} className="schedule-week-day-col">
            {HOURS.map((h) => {
              const slotDate = new Date(day);
              slotDate.setHours(h, 0, 0, 0);
              const isDropHere = 
                dropTarget && isSameDateTime(dropTarget.date, slotDate.toISOString());

              return (
                <div
                  key={h}
                  className={`schedule-week-slot ${isDropHere ? 'drop-target' : ''}`}
                  onClick={() => handleSlotClick(day, h)}
                  onDragOver={(e) => handleSlotDragOver(e, day, h)}
                  onDrop={(e) => handleSlotDrop(e, day, h)}
                />
              );
            })}

            {/* 시간 있는 이벤트 오버레이 */}
            {eventsForDay(day)
              .filter((ev) => !ev.all_day)
              .map((ev) => {
                const start = new Date(ev.start_at);
                const end = new Date(ev.end_at || ev.start_at);
                const startMin = start.getHours() * 60 + start.getMinutes();
                const endMin = end.getHours() * 60 + end.getMinutes();
                const top = (startMin / (24 * 60)) * 100;
                const height = ((endMin - startMin) / (24 * 60)) * 100;
                const isDragging = draggingEvent?.id === ev.id;
                const isEditable = canEdit(ev);

                return (
                  <div
                    key={ev.id}
                    className={`schedule-week-event ${isDragging ? 'dragging' : ''} ${isEditable ? 'draggable' : ''}`}
                    style={{
                      top: `${top}%`,
                      height: `${Math.max(height, 2)}%`,
                      background: ev.color || '#4361ee',
                    }}
                    draggable={isEditable}
                    onDragStart={(e) => handleDragStart(e, ev)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(ev);
                    }}
                  >
                    <strong>{ev.title}</strong>
                    <span>
                      {String(start.getHours()).padStart(2, '0')}:
                      {String(start.getMinutes()).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}