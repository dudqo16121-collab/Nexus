// components/meetingroom/MeetingRoomHeader.jsx
// 회의실 예약 페이지 헤더 — 원본 view-meeting-room <header> 이관.
// 날짜 선택기 + 새로고침 버튼.

import { useMeetingRoom } from '../../contexts/MeetingRoomContext';

export default function MeetingRoomHeader() {
  const { date, setDate, refresh } = useMeetingRoom();

  return (
    <header
      style={{
        background: 'transparent',
        backdropFilter: 'none',
        position: 'relative',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
          <i
            className="fa-solid fa-people-roof"
            style={{ color: 'var(--primary-color)', marginRight: 10 }}
          />
          회의실 예약
        </h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          빈 시간을 클릭하여 회의실을 즉시 예약하세요.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: '10px 15px',
            borderRadius: 10,
            border: '1px solid var(--border-color)',
            background: 'var(--input-bg)',
            color: 'var(--text-main)',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          type="button"
          className="btn btn-in"
          style={{ width: 'auto', padding: '10px 20px' }}
          onClick={() => refresh(date)}
          title="새로고침"
        >
          <i className="fa-solid fa-rotate-right" />
        </button>
      </div>
    </header>
  );
}