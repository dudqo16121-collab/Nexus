// components/meetingroom/RoomBookingEditModal.jsx
// 회의실 예약 수정/삭제 모달 + 회의 캔버스 만들기.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { useMeetingRoom } from '../../contexts/MeetingRoomContext';
import { useMeetingCanvas } from '../../contexts/MeetingCanvasContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

export default function RoomBookingEditModal() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    editModal,
    closeEditModal,
    updateBooking,
    deleteBooking,
    rooms,
    date,
  } = useMeetingRoom();
  const { createCanvas, fetchCanvas } = useMeetingCanvas();
  const { open, booking } = editModal;

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creatingCanvas, setCreatingCanvas] = useState(false);
  const [linkedCanvasId, setLinkedCanvasId] = useState(null);
  const [linkedCanvasPhase, setLinkedCanvasPhase] = useState(null);

  useEffect(() => {
    if (open && booking) {
      setReason(booking.reason || '');
      /* 이 예약에 이미 연결된 캔버스가 있는지 확인 */
      checkLinkedCanvas(booking.id);
    } else {
      setLinkedCanvasId(null);
      setLinkedCanvasPhase(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking]);

  const checkLinkedCanvas = async (bookingId) => {
    try {
      const { data } = await supabase
        .from('meeting_canvases')
        .select('id, phase')
        .eq('booking_id', bookingId)
        .maybeSingle();
      if (data) {
        setLinkedCanvasId(data.id);
        setLinkedCanvasPhase(data.phase);
      } else {
        setLinkedCanvasId(null);
        setLinkedCanvasPhase(null);
      }
    } catch (e) {
      console.warn('[RoomBookingEditModal] checkLinkedCanvas:', e);
    }
  };

  const roomName = rooms.find((r) => r.id === booking?.room_id)?.name || '회의실';
  const infoText = booking ? `[${roomName}] ${date} ${booking.time_slot}` : '';

  const handleUpdate = async () => {
    if (!reason.trim()) {
      toast.warning('변경할 사용 목적을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const result = await updateBooking(booking.id, reason);
    setSubmitting(false);
    if (result.ok) {
      toast.success('예약 정보가 수정되었습니다.');
      closeEditModal();
    } else {
      toast.error(`수정 중 오류가 발생했습니다.\n${result.error || ''}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말로 예약을 취소하시겠습니까?')) return;
    setSubmitting(true);
    const result = await deleteBooking(booking.id);
    setSubmitting(false);
    if (result.ok) {
      toast.success('예약이 성공적으로 취소되었습니다.');
      closeEditModal();
    } else {
      toast.error(`예약 취소 중 오류가 발생했습니다.\n${result.error || ''}`);
    }
  };

  /* 회의실 예약의 time_slot "HH:MM-HH:MM" 을 scheduled_at + duration_min 으로 변환 */
  const parseTimeSlot = (slot, dateStr) => {
    try {
      const [startStr, endStr] = (slot || '').split('-').map((s) => s.trim());
      if (!startStr) return { scheduled_at: null, duration_min: 60 };
      const scheduledAt = new Date(`${dateStr}T${startStr}:00`).toISOString();
      let duration = 60;
      if (endStr) {
        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        duration = (eh * 60 + em) - (sh * 60 + sm);
        if (duration <= 0) duration = 60;
      }
      return { scheduled_at: scheduledAt, duration_min: duration };
    } catch {
      return { scheduled_at: null, duration_min: 60 };
    }
  };

  const handleCreateCanvas = async () => {
    if (!booking) return;
    const { scheduled_at, duration_min } = parseTimeSlot(booking.time_slot, date);
    setCreatingCanvas(true);
    const res = await createCanvas({
      title: booking.reason || '회의',
      booking_id: booking.id,
      scheduled_at,
      duration_min,
      location: roomName,
    });
    setCreatingCanvas(false);

    if (res.ok) {
      toast.success('🎙️ 회의 캔버스가 생성됐어요. 안건을 작성해보세요.');
      closeEditModal();
      fetchCanvas(res.canvas.id);
      navigate('/meetings');
    } else {
      toast.error(`캔버스 생성 실패: ${res.error || ''}`);
    }
  };

  const handleOpenCanvas = () => {
    if (!linkedCanvasId) return;
    fetchCanvas(linkedCanvasId);
    closeEditModal();
    navigate('/meetings');
  };

  return (
    <Modal isOpen={open} onClose={closeEditModal} size="sm" title={null}>
      <div style={{ padding: 4 }}>
        <h2 style={{ marginBottom: 25, fontSize: '1.4rem' }}>예약 정보 수정</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <p
            style={{
              color: 'var(--text-main)',
              fontWeight: 600,
              fontSize: '1.05rem',
              margin: 0,
            }}
          >
            {infoText}
          </p>

          <input
            type="text"
            placeholder="사용 목적"
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
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 🎙️ 회의 캔버스 영역 */}
        <div className="mc-rb-canvas-section">
          {linkedCanvasId ? (
            <div className="mc-rb-canvas-linked">
              <div className="mc-rb-canvas-info">
                <i className="fa-solid fa-microphone" style={{ color: '#ec4899' }} />
                <div>
                  <strong>회의 캔버스 연결됨</strong>
                  <p>
                    {linkedCanvasPhase === 'pre' && '회의 전 — 안건/참석자 준비 중'}
                    {linkedCanvasPhase === 'live' && '🔴 회의 중'}
                    {linkedCanvasPhase === 'post' && '✅ 회의 종료 — 회의록 작성됨'}
                    {linkedCanvasPhase === 'archived' && '보관됨'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="mc-rb-canvas-open-btn"
                onClick={handleOpenCanvas}
              >
                열기 <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mc-rb-canvas-create-btn"
              onClick={handleCreateCanvas}
              disabled={creatingCanvas}
            >
              <i className="fa-solid fa-microphone" />
              <span>
                <strong>회의 캔버스 만들기</strong>
                <small>
                  {creatingCanvas
                    ? '생성 중...'
                    : '안건·참석자·메모·결정사항을 한곳에 — 회의가 진짜 자산이 됩니다'}
                </small>
              </span>
              <i className="fa-solid fa-arrow-right" />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            type="button"
            className="btn btn-out"
            onClick={handleDelete}
            disabled={submitting}
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
          >
            예약 취소
          </button>
          <button
            type="button"
            className="btn btn-in"
            onClick={handleUpdate}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            {submitting ? '처리 중...' : '수정 저장'}
          </button>
        </div>
      </div>
    </Modal>
  );
}