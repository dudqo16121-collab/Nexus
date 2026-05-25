// hooks/useMeetingBadge.js
// 회의 뱃지 카운트 계산.
//   - 미응답 RSVP: 본인이 참석자인데 pending 상태인 회의
//   - 다가오는 회의: 오늘/내일 예정된 회의

import { useMemo } from 'react';
import { useMeetingCanvas } from '../contexts/MeetingCanvasContext';
import { useAuth } from '../contexts/AuthContext';

export function useMeetingBadge() {
  const { user } = useAuth();
  const { myMeetings } = useMeetingCanvas();

  return useMemo(() => {
    if (!user || !myMeetings?.length) {
      return { pendingRsvp: 0, upcomingToday: 0, liveNow: 0, total: 0 };
    }

    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(startOfToday); endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);

    let pendingRsvp = 0;
    let upcomingToday = 0;
    let liveNow = 0;

    /* myMeetings 가 캔버스 정보만 있고 attendees 는 없음.
       대신 미응답 카운트는 별도 쿼리가 필요한데, 일단 단순히
       "다가오는 회의" 카운트만 정확히 제공하고
       미응답 RSVP 는 회의 목록 페이지의 카드에 표시 */

    for (const m of myMeetings) {
      if (m.phase === 'live') {
        liveNow++;
        continue;
      }
      if (m.phase !== 'pre') continue;
      if (!m.scheduled_at) continue;

      const t = new Date(m.scheduled_at);
      if (t >= startOfToday && t < endOfTomorrow) {
        upcomingToday++;
      }
    }

    return {
      pendingRsvp,
      upcomingToday,
      liveNow,
      total: upcomingToday + liveNow,
    };
  }, [user, myMeetings]);
}