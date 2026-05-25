// pages/MeetingRoom.jsx
// 회의실 예약 메인 페이지.
// 원본 index.html <section id="view-meeting-room"> 전체를 React 로 이관.

import MeetingRoomHeader from '../components/meetingroom/MeetingRoomHeader';
import RoomGrid from '../components/meetingroom/RoomGrid';
import RoomLegend from '../components/meetingroom/RoomLegend';
import RoomBookingModal from '../components/meetingroom/RoomBookingModal';
import RoomBookingEditModal from '../components/meetingroom/RoomBookingEditModal';

export default function MeetingRoom() {
  return (
    <section id="view-meeting-room">
      <MeetingRoomHeader />

      <div className="panel" style={{ paddingBottom: 50 }}>
        <RoomGrid />
        <RoomLegend />
      </div>

      {/* 모달 2종 — 항상 마운트, 내부에서 isOpen 으로 표시 제어 */}
      <RoomBookingModal />
      <RoomBookingEditModal />
    </section>
  );
}