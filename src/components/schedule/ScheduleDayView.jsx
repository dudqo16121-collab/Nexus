// 일 뷰 — 하루의 24시간 타임라인. 드래그앤드롭으로 시간 이동 지원.

import { useSchedule } from '../../contexts/ScheduleContext';
import { useScheduleDnd } from '../../contexts/ScheduleDndContext';
import { calculateMovedDates, isSameDateTime } from './scheduleDndUtils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function ScheduleDayView() {
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

  /* 드래그 핸들러 */
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

  const handleSlotDragOver = (e, hour) => {
    if (!draggingEvent) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const targetDate = new Date(currentDate);
    targetDate.setHours(hour, 0, 0, 0);
    if (!dropTarget || !isSameDateTime(dropTarget.date, targetDate.toISOString())) {
      updateDropTarget({ date: targetDate.toISOString(), hour });
    }
  };

  const handleSlotDrop = (e, hour) => {
    e.preventDefault();
    if (!draggingEvent) return;

    const targetDate = new Date(currentDate);
    targetDate.setHours(hour, 0, 0, 0);

    if (isSameDateTime(targetDate.toISOString(), draggingEvent.start_at)) {
      endDrag();
      return;
    }

    const { newStartAt, newEndAt } = calculateMovedDates(draggingEvent, targetDate, true);
    openConfirm(draggingEvent, newStartAt, newEndAt);
    endDrag();
  };

  return (
    <div className="schedule-day-view">
      {alldayEvents.length > 0 && (
        <div className="schedule-day-allday">
          <div className="schedule-day-allday-label">종일</div>
          <div className="schedule-day-allday-list">
            {alldayEvents.map((ev) => {
              const isEditable = canEdit(ev);
              const isDragging = draggingEvent?.id === ev.id;
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
          {HOURS.map((h) => {
            const slotDate = new Date(currentDate);
            slotDate.setHours(h, 0, 0, 0);
            const isDropHere = 
              dropTarget && isSameDateTime(dropTarget.date, slotDate.toISOString());

            return (
              <div
                key={h}
                className={`schedule-day-slot ${isDropHere ? 'drop-target' : ''}`}
                onClick={() => handleSlotClick(h)}
                onDragOver={(e) => handleSlotDragOver(e, h)}
                onDrop={(e) => handleSlotDrop(e, h)}
              />
            );
          })}

          {timedEvents.map((ev) => {
            const start = new Date(ev.start_at);
            const end = new Date(ev.end_at || ev.start_at);
            const startMin = start.getHours() * 60 + start.getMinutes();
            const endMin = end.getHours() * 60 + end.getMinutes();
            const top = (startMin / (24 * 60)) * 100;
            const height = ((endMin - startMin) / (24 * 60)) * 100;
            const isEditable = canEdit(ev);
            const isDragging = draggingEvent?.id === ev.id;

            return (
              <div
                key={ev.id}
                className={`schedule-day-event ${isDragging ? 'dragging' : ''} ${isEditable ? 'draggable' : ''}`}
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
                  {String(start.getMinutes()).padStart(2, '0')} -{' '}
                  {String(end.getHours()).padStart(2, '0')}:
                  {String(end.getMinutes()).padStart(2, '0')}
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