// components/schedule/scheduleDndUtils.js
// 드래그앤드롭 공통 헬퍼.

const pad = (n) => String(n).padStart(2, '0');

/**
 * 이벤트를 새 날짜(시간 보존) 또는 새 날짜/시간으로 이동했을 때의
 * 새 start_at, end_at을 계산.
 *
 * @param {object} event - 원본 이벤트
 * @param {Date}   newDate - 새 날짜 (시:분도 사용할지 useTime으로 결정)
 * @param {boolean} useTime - true면 newDate의 시:분도 사용. false면 원본의 시간 유지.
 */
export function calculateMovedDates(event, newDate, useTime = false) {
  const origStart = new Date(event.start_at);
  const origEnd = new Date(event.end_at || event.start_at);
  const duration = origEnd.getTime() - origStart.getTime();

  let newStart;
  if (useTime) {
    newStart = new Date(newDate);
  } else {
    /* 시:분은 보존 */
    newStart = new Date(newDate);
    newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
  }

  const newEnd = new Date(newStart.getTime() + duration);

  if (event.all_day) {
    /* 종일 이벤트 — 시간 부분 제거 */
    return {
      newStartAt: `${newStart.getFullYear()}-${pad(newStart.getMonth() + 1)}-${pad(newStart.getDate())}T00:00:00`,
      newEndAt: `${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())}T23:59:59`,
    };
  }

  return {
    newStartAt: newStart.toISOString(),
    newEndAt: newEnd.toISOString(),
  };
}

/**
 * 두 날짜가 같은 날인지 (시간 무시)
 */
export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 두 ISO 문자열이 같은 시간을 가리키는지
 */
export function isSameDateTime(a, b) {
  return new Date(a).getTime() === new Date(b).getTime();
}