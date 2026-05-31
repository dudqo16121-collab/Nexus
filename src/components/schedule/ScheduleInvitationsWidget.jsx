// components/schedule/ScheduleInvitationsWidget.jsx
// 사이드바 위젯 — 응답 대기 중인 초대.

import { useState } from 'react';
import { useSchedule, INVITATION_STATUS } from '../../contexts/ScheduleContext';
import { useToast } from '../../contexts/ToastContext';

function fmtEventTime(iso, allDay) {
  if (!iso) return '';
  const d = new Date(iso);
  if (allDay) {
    return d.toLocaleDateString('ko-KR', {
      month: 'short', day: 'numeric', weekday: 'short',
    });
  }
  return d.toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ScheduleInvitationsWidget() {
  const toast = useToast();
  const { myPendingInvitations, events, respondToInvitation } = useSchedule();
  const [responding, setResponding] = useState(null);

  if (myPendingInvitations.length === 0) return null;

  const handleRespond = async (invitationId, status) => {
    setResponding(invitationId);
    const res = await respondToInvitation(invitationId, status);
    setResponding(null);
    if (res.ok) {
      const label = INVITATION_STATUS[status].label;
      toast.success(`${label}으로 응답했어요`);
    } else {
      toast.error(res.error || '응답 실패');
    }
  };

  return (
    <div className="schedule-invitations-widget">
      <div className="schedule-invitations-header">
        <i className="fa-solid fa-envelope-open-text" style={{ color: '#f59e0b' }} />
        <h4>받은 초대</h4>
        <span className="schedule-invitations-count">{myPendingInvitations.length}</span>
      </div>

      <div className="schedule-invitations-list">
        {myPendingInvitations.map((inv) => {
          const event = events.find((e) => e.id === inv.event_id);
          if (!event) return null;
          const isResponding = responding === inv.id;

          return (
            <div key={inv.id} className="schedule-invitation-card">
              <div
                className="schedule-invitation-color"
                style={{ background: event.color || '#4361ee' }}
              />
              <div className="schedule-invitation-body">
                <div className="schedule-invitation-title">{event.title}</div>
                <div className="schedule-invitation-time">
                  <i className="fa-regular fa-clock" />
                  {fmtEventTime(event.start_at, event.all_day)}
                </div>
                <div className="schedule-invitation-actions">
                  <button
                    type="button"
                    className="schedule-invitation-btn accept"
                    onClick={() => handleRespond(inv.id, 'accepted')}
                    disabled={isResponding}
                    title="수락"
                  >
                    <i className="fa-solid fa-check" />
                  </button>
                  <button
                    type="button"
                    className="schedule-invitation-btn tentative"
                    onClick={() => handleRespond(inv.id, 'tentative')}
                    disabled={isResponding}
                    title="미정"
                  >
                    <i className="fa-solid fa-question" />
                  </button>
                  <button
                    type="button"
                    className="schedule-invitation-btn decline"
                    onClick={() => handleRespond(inv.id, 'declined')}
                    disabled={isResponding}
                    title="거절"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}