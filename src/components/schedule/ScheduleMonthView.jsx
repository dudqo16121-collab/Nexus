// 월 뷰 — 6주 × 7일 그리드. 드래그앤드롭으로 일정 이동 지원.

import { useSchedule } from '../../contexts/ScheduleContext';
import { useScheduleDnd } from '../../contexts/ScheduleDndContext';
import { calculateMovedDates, isSameDay } from './scheduleDndUtils';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

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

  /* ─── 드래그 핸들러 ─── */
  const handleDragStart = (e, event) => {
    if (!canEdit(event)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
    /* 드래그 고스트는 브라우저 기본 사용 (편집 가능 일정 카드의 작은 복사본) */
    startDrag(event);
  };

  const handleDragEnd = () => {
    endDrag();
  };

  const handleDragOver = (e, cellDate) => {
    if (!draggingEvent) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (
      !dropTarget ||
      !isSameDay(new Date(dropTarget.date), cellDate)
    ) {
      updateDropTarget({ date: cellDate.toISOString() });
    }
  };

  const handleDragLeave = (e) => {
    /* 자식 요소로 이동한 거면 무시 */
    if (e.currentTarget.contains(e.relatedTarget)) return;
    /* 셀에서 빠져나갈 때만 클리어 — 다음 셀 진입 시 다시 set됨 */
  };

  const handleDrop = (e, cellDate) => {
    e.preventDefault();
    if (!draggingEvent) return;

    const origStart = new Date(draggingEvent.start_at);

    /* 같은 날짜에 떨어진 경우 — 의미 없는 이동 */
    if (isSameDay(origStart, cellDate)) {
      endDrag();
      return;
    }

    /* 새 날짜/시간 계산 (시간 보존) */
    const { newStartAt, newEndAt } = calculateMovedDates(draggingEvent, cellDate, false);

    /* 확인 모달 오픈 */
    openConfirm(draggingEvent, newStartAt, newEndAt);
    endDrag();
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

          const isDropTarget = 
            dropTarget && isSameDay(new Date(dropTarget.date), date);
          const isDragSourceDay = 
            draggingEvent && date.toISOString().substring(0, 10) === draggingEvent.start_at?.substring(0, 10);

          return (
            <div
              key={i}
              className={`schedule-month-cell ${outside ? 'outside' : ''} ${isToday(date) ? 'today' : ''} ${isDropTarget ? 'drop-target' : ''} ${isDragSourceDay ? 'drag-source' : ''}`}
              onClick={(e) => {
                /* 일정 카드 클릭 버블링 막기 — 셀 클릭 시에만 새 일정 */
                if (e.target.closest('.schedule-month-event')) return;
                if (e.target.closest('.schedule-month-overflow')) return;
                openCreateModal(date);
              }}
              onDragOver={(e) => handleDragOver(e, date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
            >
              <div
                className="schedule-month-date"
                style={{
                  color: outside
                    ? 'var(--text-muted)'
                    : isToday(date)
                    ? '#fff'
                    : dayOfWeek === 0
                    ? 'var(--danger)'
                    : dayOfWeek === 6
                    ? 'var(--primary-color)'
                    : 'var(--text-main)',
                }}
              >
                {date.getDate()}
              </div>

              {visible.map((ev) => {
                const isDragging = draggingEvent?.id === ev.id;
                const isEditable = canEdit(ev);
                return (
                  <div
                    key={ev.id}
                    className={`schedule-month-event ${isDragging ? 'dragging' : ''} ${isEditable ? 'draggable' : ''}`}
                    style={{ background: ev.color || '#4361ee' }}
                    draggable={isEditable}
                    onDragStart={(e) => handleDragStart(e, ev)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(ev);
                    }}
                    title={isEditable ? '드래그해서 이동' : ''}
                  >
                    {ev.title}
                    {ev.is_recurring && (
                      <i className="fa-solid fa-repeat" style={{ marginLeft: 4, fontSize: '0.7em' }} />
                    )}
                  </div>
                );
              })}

              {overflow > 0 && (
                <div className="schedule-month-overflow">
                  + {overflow}개 더
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}