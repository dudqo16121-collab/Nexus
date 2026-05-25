// config/meetingRoomConfig.js
// 회의실 예약 관련 메타 데이터 단일 출처.
// 원본 script.js 14번 블록의 timeSlots 등을 이관.

/* 예약 가능한 시간대 — 원본 renderMeetingRooms 의 timeSlots 그대로 */
export const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

/* 슬롯 상태 — 렌더링/클릭 동작 분기에 사용 */
export const SLOT_STATE = {
  FREE: 'free', // 예약 가능
  BOOKED: 'booked', // 타부서 예약 (클릭 불가)
  MINE: 'mine', // 내 예약 or 관리자 (수정/삭제 가능)
};

/* 오늘 날짜 YYYY-MM-DD — date input 기본값 */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}