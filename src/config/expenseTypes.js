// config/expenseTypes.js
// 법인카드 정산 관련 메타 데이터 단일 출처 (approvalForms.js / leaveTypes.js 와 동일 패턴).
// 원본 script.js 의 EXPENSE_CAT_COLORS / expenseStatusLabel / genExpenseDocNumber 이관.

/* 지출 카테고리 — 원본 select option 순서 그대로.
   value 는 expense_records.category 에 저장되는 문자열. */
export const EXPENSE_CATEGORIES = [
  { value: '식비', emoji: '🍱' },
  { value: '교통비', emoji: '🚕' },
  { value: '숙박비', emoji: '🏨' },
  { value: '접대비', emoji: '🥂' },
  { value: '사무용품', emoji: '📎' },
  { value: '통신비', emoji: '📞' },
  { value: '교육/도서', emoji: '📚' },
  { value: '기타', emoji: '📌' },
];

/* 카테고리별 컬러 — 원본 EXPENSE_CAT_COLORS 그대로.
   차트 도넛 / 카테고리 뱃지에서 공용 사용. */
export const EXPENSE_CAT_COLORS = {
  식비: '#ff6b6b',
  교통비: '#4cc9f0',
  숙박비: '#9d4edd',
  접대비: '#ff9f1c',
  사무용품: '#06d6a0',
  통신비: '#118ab2',
  '교육/도서': '#ffd166',
  기타: '#94a3b8',
};

/* 카테고리 컬러 안전 조회 */
export function catColor(category) {
  return EXPENSE_CAT_COLORS[category] || '#94a3b8';
}

/* 결제수단 — 지출 등록 모달 select */
export const PAYMENT_METHODS = [
  { value: '법인카드', label: '법인카드' },
  { value: '개인카드', label: '개인카드 (선결제)' },
  { value: '현금', label: '현금 (선결제)' },
  { value: '계좌이체', label: '계좌이체' },
];

/* 상태 → 라벨 매핑. 원본 expenseStatusLabel 이관.
   CSS 클래스(ex-status-badge / erc-status)는 status 값을 그대로 className 으로 쓴다
   (예: <span className={`ex-status-badge ${status}`}>) — style.css 에 이미 정의됨. */
export const EXPENSE_STATUS_LABEL = {
  pending: '정산 대기',
  submitted: '신청됨',
  approved: '승인 완료',
  rejected: '반려됨',
  draft: '임시저장',
  in_progress: '결재 중',
  canceled: '취소됨',
};

export function expenseStatusLabel(s) {
  return EXPENSE_STATUS_LABEL[s] || s || '-';
}

/* 지출 내역 필터용 상태 옵션 (expense_records.status) */
export const RECORD_STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'pending', label: '정산 대기' },
  { value: 'submitted', label: '신청됨' },
  { value: 'approved', label: '정산 완료' },
  { value: 'rejected', label: '반려됨' },
];

/* 정산 신청 내역 필터용 상태 옵션 (expense_reports.status) */
export const REPORT_STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'draft', label: '임시저장' },
  { value: 'pending', label: '결재 대기' },
  { value: 'in_progress', label: '결재 중' },
  { value: 'approved', label: '승인 완료' },
  { value: 'rejected', label: '반려' },
];

/* 통화 포맷 — 원본 fmtKRW 이관 */
export function fmtKRW(n) {
  return '₩ ' + Number(n || 0).toLocaleString('ko-KR');
}

/* 정산서 문서번호 생성 — 원본 genExpenseDocNumber 이관. 형식: EXP-YYMMDD-NNN */
export function genExpenseDocNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rnd = Math.floor(Math.random() * 900) + 100;
  return `EXP-${yy}${mm}${dd}-${rnd}`;
}

/* 정산 신청이 전자결재로 넘어갈 때 쓰는 양식 타입.
   원본 submitExpenseReport 의 approvals.insert 에서 type:'법인카드정산' 사용. */
export const EXPENSE_APPROVAL_TYPE = '법인카드정산';
