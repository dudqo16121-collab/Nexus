// components/schedule/ScheduleMoveConfirmModal.jsx
// 드래그앤드롭 일정 이동 확인 모달.

import { useState } from 'react';
import Modal from '../common/Modal';
import { useScheduleDnd } from '../../contexts/ScheduleDndContext';
import { useSchedule } from '../../contexts/ScheduleContext';
import { useToast } from '../../contexts/ToastContext';

function fmtFull(iso, allDay) {
  if (!iso) return '';
  const d = new Date(iso);
  if (allDay) {
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });
  }
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ScheduleMoveConfirmModal() {
  const toast = useToast();
  const { confirmModal, closeConfirm } = useScheduleDnd();
  const { moveEvent } = useSchedule();
  const [submitting, setSubmitting] = useState(false);

  const { open, event, newStart, newEnd } = confirmModal;

  if (!event) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    const res = await moveEvent(event.id, {
      newStartAt: newStart,
      newEndAt: newEnd,
    });
    setSubmitting(false);

    if (res.ok) {
      toast.success('일정이 이동되었습니다.');
      closeConfirm();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeConfirm} size="sm" title="일정 이동">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
        <div className="schedule-move-event-card">
          <div
            className="schedule-move-color"
            style={{ background: event.color || '#4361ee' }}
          />
          <div className="schedule-move-title">{event.title}</div>
        </div>

        <div className="schedule-move-arrow">
          <div className="schedule-move-from">
            <span className="schedule-move-label">현재</span>
            <strong>{fmtFull(event.start_at, event.all_day)}</strong>
          </div>
          <div className="schedule-move-arrow-icon">
            <i className="fa-solid fa-arrow-down" />
          </div>
          <div className="schedule-move-to">
            <span className="schedule-move-label">변경</span>
            <strong>{fmtFull(newStart, event.all_day)}</strong>
          </div>
        </div>

        {event.is_recurring && (
          <div className="schedule-move-warn">
            <i className="fa-solid fa-triangle-exclamation" />
            반복 일정의 시작 날짜를 변경하면 모든 인스턴스가 새 기준으로 다시 생성돼요.
          </div>
        )}

        {event.room_booking_id && (
          <div className="schedule-move-info">
            <i className="fa-solid fa-door-open" />
            연결된 회의실 예약도 함께 이동됩니다.
          </div>
        )}
      </div>

      <div className="modal-buttons">
        <button
          type="button"
          className="btn btn-out"
          onClick={closeConfirm}
          disabled={submitting}
        >
          취소
        </button>
        <button
          type="button"
          className="btn btn-in"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? '이동 중...' : '이동'}
        </button>
      </div>
    </Modal>
  );
}