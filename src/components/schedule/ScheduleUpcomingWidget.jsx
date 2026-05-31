// components/schedule/ScheduleUpcomingWidget.jsx
// 사이드바 위젯 — 오늘 일정 + 다음 일정까지 카운트다운.

import { useEffect, useState } from 'react';
import { useSchedule, CATEGORIES } from '../../contexts/ScheduleContext';

function getCategoryMeta(catId) {
  return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
}

function formatCountdown(targetTs) {
  const now = Date.now();
  const diff = targetTs - now;
  if (diff <= 0) return '진행 중';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 ${hours % 24}시간 후`;
  if (hours > 0) return `${hours}시간 ${minutes % 60}분 후`;
  if (minutes > 0) return `${minutes}분 후`;
  return '잠시 후';
}

function formatEventTime(event) {
  if (event.all_day) return '종일';
  const d = new Date(event.start_at);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function ScheduleUpcomingWidget() {
  const { todayEvents, nextEvent, openEditModal } = useSchedule();
  const [, forceUpdate] = useState(0);

  /* 1분마다 카운트다운 갱신 */
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const nextTs = nextEvent ? new Date(nextEvent.start_at).getTime() : null;
  const countdown = nextTs ? formatCountdown(nextTs) : null;

  return (
    <div className="schedule-upcoming-widget">
      <div className="schedule-upcoming-header">
        <i className="fa-solid fa-clock" style={{ color: 'var(--primary-color)' }} />
        <h4>다가오는 일정</h4>
      </div>

      {/* 다음 일정 카운트다운 카드 */}
      {nextEvent ? (
        <div
          className="schedule-next-event"
          onClick={() => openEditModal(nextEvent)}
          style={{
            borderLeftColor: nextEvent.color || getCategoryMeta(nextEvent.category).color,
          }}
        >
          <div className="schedule-next-event-countdown">
            <i className="fa-solid fa-hourglass-half" />
            <strong>{countdown}</strong>
          </div>
          <div className="schedule-next-event-title">{nextEvent.title}</div>
          <div className="schedule-next-event-time">
            <i className="fa-regular fa-clock" />
            {formatEventTime(nextEvent)}
            {nextEvent.is_recurring_instance && (
              <span className="schedule-next-event-repeat">
                <i className="fa-solid fa-repeat" /> 반복
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="schedule-upcoming-empty">
          <i className="fa-regular fa-calendar-check" />
          <span>예정된 일정이 없어요</span>
        </div>
      )}

      {/* 오늘 일정 리스트 */}
      {todayEvents.length > 0 && (
        <div className="schedule-today-events">
          <div className="schedule-today-label">
            <i className="fa-solid fa-calendar-day" />
            오늘 일정 <strong>{todayEvents.length}</strong>개
          </div>
          <div className="schedule-today-list">
            {todayEvents.slice(0, 5).map((event) => {
              const meta = getCategoryMeta(event.category);
              const isPast = new Date(event.end_at || event.start_at).getTime() < Date.now();
              const isNow =
                new Date(event.start_at).getTime() <= Date.now() &&
                new Date(event.end_at || event.start_at).getTime() >= Date.now();
              return (
                <div
                  key={event.id}
                  className={`schedule-today-item ${isPast ? 'past' : ''} ${isNow ? 'now' : ''}`}
                  onClick={() => openEditModal(event)}
                  style={{ borderLeftColor: event.color || meta.color }}
                >
                  <span className="schedule-today-time">
                    {event.all_day ? '종일' : formatEventTime(event)}
                  </span>
                  <span className="schedule-today-title">{event.title}</span>
                  {isNow && <span className="schedule-today-now-badge">진행 중</span>}
                </div>
              );
            })}
            {todayEvents.length > 5 && (
              <div className="schedule-today-more">+{todayEvents.length - 5}개 더</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}