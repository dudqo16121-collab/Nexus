// components/schedule/ScheduleUpcomingBanner.jsx
// 상단 헤더 뜰몽 — 다음 일정이 1시간 이내일 때 표시되는 알림 바.

import { useEffect, useState } from 'react';
import { useSchedule } from '../../contexts/ScheduleContext';

function formatTimeLeft(targetTs) {
  const now = Date.now();
  const diff = targetTs - now;
  if (diff <= 0) return null;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours >= 1) return `${hours}시간 ${minutes % 60}분 후`;
  if (minutes > 0) return `${minutes}분 후`;
  return '곧 시작';
}

function formatStartTime(iso) {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function ScheduleUpcomingBanner() {
  const { nextEvent, openEditModal } = useSchedule();
  const [, forceUpdate] = useState(0);
  const [dismissed, setDismissed] = useState(null); // 닫은 일정 ID

  /* 1분마다 갱신 */
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /* 다음 일정이 바뀌면 dismissed 초기화 */
  useEffect(() => {
    setDismissed(null);
  }, [nextEvent?.id]);

  if (!nextEvent) return null;
  if (dismissed === nextEvent.id) return null;

  const targetTs = new Date(nextEvent.start_at).getTime();
  const now = Date.now();
  const diffMin = (targetTs - now) / 60000;

  /* 1시간 이내일 때만 뜸 */
  if (diffMin > 60 || diffMin < 0) return null;

  const timeLeft = formatTimeLeft(targetTs);
  if (!timeLeft) return null;

  /* 5분 이내면 더 긴급한 스타일 */
  const isUrgent = diffMin <= 5;

  return (
    <div className={`schedule-upcoming-banner ${isUrgent ? 'urgent' : ''}`}>
      <div className="schedule-upcoming-banner-icon">
        <i className={`fa-solid ${isUrgent ? 'fa-bell' : 'fa-calendar-day'}`} />
      </div>
      <div className="schedule-upcoming-banner-content">
        <div className="schedule-upcoming-banner-time">
          <strong>{timeLeft}</strong>
          <span>{formatStartTime(nextEvent.start_at)} 시작</span>
        </div>
        <div
          className="schedule-upcoming-banner-title"
          onClick={() => openEditModal(nextEvent)}
        >
          {nextEvent.title}
          <i className="fa-solid fa-arrow-right" />
        </div>
      </div>
      <button
        type="button"
        className="schedule-upcoming-banner-close"
        onClick={() => setDismissed(nextEvent.id)}
        title="알림 닫기"
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}