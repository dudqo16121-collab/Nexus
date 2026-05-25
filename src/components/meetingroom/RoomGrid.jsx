// components/meetingroom/RoomGrid.jsx
// 회의실 그리드 — 원본 renderMeetingRooms 이관.
// 회의실마다 한 행: 좌측 정보 + 우측 타임슬롯 9개.
// 슬롯 상태 3가지(예약가능 / 타부서예약 / 내예약)에 따라 클래스·클릭 동작 분기.

import { useMeetingRoom } from '../../contexts/MeetingRoomContext';
import { TIME_SLOTS } from '../../config/meetingRoomConfig';
import { useToast } from '../../contexts/ToastContext';

export default function RoomGrid() {
  const toast = useToast();
  const {
    rooms,
    bookings,
    loading,
    error,
    isMyBooking,
    openBookingModal,
    openEditModal,
  } = useMeetingRoom();

  if (loading) {
    return (
      <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
        로딩 중...
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ textAlign: 'center', padding: 20, color: 'var(--danger)' }}>
        데이터를 불러오지 못했습니다: {error}
      </p>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
        등록된 회의실이 없습니다.
      </p>
    );
  }

  /* 슬롯 클릭 시 타부서 예약이면 안내만 */
  const handleBookedClick = () => {
    toast.success('타부서에서 예약한 시간입니다.');
  };

  return (
    <div className="room-grid">
      {rooms.map((room) => (
        <div className="room-row" key={room.id}>
          <div className="room-info">
            <h4>{room.name}</h4>
            <p>
              수용인원: {room.capacity}명
              <br />
              {/* 원본은 equipment 에 <i> 태그가 들어있을 수 있어 dangerouslySetInnerHTML.
                  데이터 출처가 사내 관리자 입력으로 신뢰 범위. */}
              <span
                dangerouslySetInnerHTML={{ __html: room.equipment || '' }}
              />
            </p>
          </div>

          <div className="timeline-container">
            {TIME_SLOTS.map((time) => {
              const booking = bookings.find(
                (b) => b.room_id === room.id && b.time_slot === time
              );

              if (!booking) {
                // 예약 가능
                return (
                  <div
                    key={time}
                    className="time-slot"
                    title={`${time} - 예약가능`}
                    onClick={() => openBookingModal(room, time)}
                  >
                    <span>{time}</span>
                  </div>
                );
              }

              if (isMyBooking(booking)) {
                // 내 예약 (또는 관리자) — 수정/삭제
                return (
                  <div
                    key={time}
                    className="time-slot booked-danger"
                    title={`내 예약: ${booking.reason} (클릭하여 수정/삭제)`}
                    onClick={() => openEditModal(booking)}
                  >
                    <span>{time}</span>
                  </div>
                );
              }

              // 타부서 예약 — 클릭 불가
              return (
                <div
                  key={time}
                  className="time-slot booked"
                  title={`${time} - ${booking.user_name} (${booking.reason})`}
                  onClick={handleBookedClick}
                >
                  <span>{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}