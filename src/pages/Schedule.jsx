// pages/Schedule.jsx
// 일정 관리 페이지 — 헤더 + 뜰몽 + 좌측 사이드바 + 본문 뷰 + 이벤트 모달.

import { useEffect } from 'react';
import { useSchedule } from '../contexts/ScheduleContext';
import { ScheduleDndProvider } from '../contexts/ScheduleDndContext';
import ScheduleHeader from '../components/schedule/ScheduleHeader';
import ScheduleUpcomingBanner from '../components/schedule/ScheduleUpcomingBanner';
import ScheduleSidebar from '../components/schedule/ScheduleSidebar';
import ScheduleMonthView from '../components/schedule/ScheduleMonthView';
import ScheduleWeekView from '../components/schedule/ScheduleWeekView';
import ScheduleDayView from '../components/schedule/ScheduleDayView';
import ScheduleEventModal from '../components/schedule/ScheduleEventModal';
import ScheduleMoveConfirmModal from '../components/schedule/ScheduleMoveConfirmModal';

export default function Schedule() {
  const { viewMode, fetchEvents } = useSchedule();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <ScheduleDndProvider>
      <section id="view-schedule">
        <ScheduleHeader />
        <ScheduleUpcomingBanner />

        <div className="schedule-layout">
          <ScheduleSidebar />
          <main className="schedule-main">
            {viewMode === 'month' && <ScheduleMonthView />}
            {viewMode === 'week' && <ScheduleWeekView />}
            {viewMode === 'day' && <ScheduleDayView />}
          </main>
        </div>

        <ScheduleEventModal />
        <ScheduleMoveConfirmModal />
      </section>
    </ScheduleDndProvider>
  );
}