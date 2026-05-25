// config/leaveTypes.js
// 근태/연차 관련 메타 데이터 단일 출처 (approvalForms.js 와 동일한 패턴)
// 원본 script.js 의 LEAVE_POLICY / _leaveDaysFromFields / statusMap 를 이관.

/* 회사 연차 정책 — 필요시 이 객체만 수정 */
export const LEAVE_POLICY = {
  DEFAULT_ANNUAL_DAYS: 15, // 1년차 이상 기본 연차
  USE_PROFILE_FIELD: true, // profiles.annual_leave_days 가 있으면 우선 사용
};

/* 휴가 신청은 결재(approvals) 테이블의 '연차신청서' 양식을 그대로 사용한다.
   approvalForms.js 의 양식 키와 반드시 일치시킬 것. */
export const LEAVE_FORM_TYPE = '연차신청서';

/* 휴가 종류 — 기안 작성 시 참고용 (원본은 자유 입력 text 였음).
   value 는 fields.f_leave_type 에 저장되는 문자열. */
export const LEAVE_KINDS = [
  { value: '연차', label: '연차', defaultDays: 1 },
  { value: '오전 반차', label: '오전 반차', defaultDays: 0.5 },
  { value: '오후 반차', label: '오후 반차', defaultDays: 0.5 },
  { value: '병가', label: '병가', defaultDays: 1 },
  { value: '경조사', label: '경조사', defaultDays: 1 },
  { value: '공가', label: '공가', defaultDays: 1 },
];

/* 결재 상태 → 화면 표기 매핑. 원본 _renderLeaveHistory 의 statusMap 이관.
   CSS 클래스(status-pending 등)는 기존 style.css 그대로 사용. */
export const LEAVE_STATUS_MAP = {
  pending: { label: '승인 대기', cls: 'status-pending' },
  approved: { label: '승인 완료', cls: 'status-approved' },
  rejected: { label: '반려', cls: 'status-rejected' },
  draft: { label: '임시저장', cls: 'status-pending' },
  cancelled: { label: '취소', cls: 'status-rejected' },
};

/* 출근 상태 라벨 — attendance.status 컬럼 값 */
export const ATTENDANCE_STATUS = {
  NORMAL: '정상',
  LATE: '지각',
};

/**
 * 휴가 신청 1건의 차감 일수 계산.
 * 원본 script.js _leaveDaysFromFields 와 동일한 우선순위:
 *  1) f_days 가 직접 입력돼 있으면 그 값
 *  2) 종류에 '반차' 포함 시 0.5
 *  3) 시작/종료일 차이로 계산 (양 끝 포함)
 * @param {object|null} fields - approvals.fields (jsonb)
 * @returns {number}
 */
export function leaveDaysFromFields(fields) {
  if (!fields) return 0;

  // 1) f_days 직접 입력
  const direct = parseFloat(fields.f_days);
  if (!isNaN(direct) && direct > 0) return direct;

  // 2) 종류별 추정
  const t = (fields.f_leave_type || '').toLowerCase();
  if (t.includes('반차')) return 0.5;

  // 3) 시작/종료일로 계산
  if (fields.f_start_date && fields.f_end_date) {
    const s = new Date(fields.f_start_date);
    const e = new Date(fields.f_end_date);
    if (!isNaN(s) && !isNaN(e)) {
      return Math.max(1, Math.round((e - s) / 86400000) + 1);
    }
  }
  return 0;
}

/**
 * 시작/종료일을 사람이 읽는 기간 문자열로.
 * 원본 _renderLeaveHistory 의 period 계산 이관.
 */
export function formatLeavePeriod(fields) {
  const f = fields || {};
  const sd = f.f_start_date || '';
  const ed = f.f_end_date || '';
  if (sd && ed) return sd === ed ? sd : `${sd} ~ ${ed}`;
  return sd || ed || '-';
}

/* 연도 필터 옵션 — 올해부터 2년 전까지 (원본 _initLeaveYearFilter 와 동일) */
export function getLeaveYearOptions() {
  const thisYear = new Date().getFullYear();
  return [thisYear, thisYear - 1, thisYear - 2];
}
