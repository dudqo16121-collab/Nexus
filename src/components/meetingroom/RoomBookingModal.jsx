// components/meetingroom/RoomBookingModal.jsx
// 회의실 예약 모달 — 원본 #room-booking-modal + openRoomBookingModal /
// confirmRoomBooking 이관. 공통 Modal 래퍼 사용.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useMeetingRoom } from '../../contexts/MeetingRoomContext';
import { useToast } from '../../contexts/ToastContext';
import BookmarkButton from '../common/BookmarkButton';

export default function RoomBookingModal() {
  const toast = useToast();
  const { bookingModal, closeBookingModal, createBooking, date } =
    useMeetingRoom();
  const { open, room, timeSlot } = bookingModal;

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* 모달 열릴 때 입력 초기화 */
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.warning('사용 목적을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const result = await createBooking({
      roomId: room.id,
      timeSlot,
      reason,
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success('회의실 예약이 완료되었습니다.');
      closeBookingModal();
    } else {
      toast.error(`예약 처리 중 오류가 발생했습니다.\n${result.error || ''}`);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeBookingModal} size="sm" title={null}>
      <div style={{ padding: 4 }}>
        <h2 style={{ marginBottom: 25, fontSize: '1.4rem' }}>회의실 예약</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <p
              style={{
                color: 'var(--text-main)',
                fontWeight: 600,
                fontSize: '1.05rem',
                margin: 0,
              }}
            >
              {room ? `[${room.name}] ${date} ${timeSlot} 예약` : ''}
            </p>
            {/* ⭐ 이 회의실 즐겨찾기 */}
            {room && (
              <BookmarkButton
                kind="meeting_room"
                refId={room.id}
                title={`${room.name} 회의실`}
                subtitle={`정원 ${room.capacity || '?'}명`}
                link="/meetingroom"
                size="md"
              />
            )}
          </div>
          <input
            type="text"
            placeholder="사용 목적 (예: 주간 회의)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: '100%',
              padding: 15,
              border: '1px solid var(--border-color)',
              background: 'var(--input-bg)',
              color: 'var(--text-main)',
              borderRadius: 10,
              fontSize: '1rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 30 }}>
          <button
            type="button"
            className="btn btn-out"
            onClick={closeBookingModal}
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
            {submitting ? '처리 중...' : '예약 확정'}
          </button>
        </div>
      </div>
    </Modal>
  );
}