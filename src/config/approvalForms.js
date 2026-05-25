// 양식별 메타데이터 — 단일 출처 (Single Source of Truth)

export const FORM_META = {
  업무기안서: { emoji: '📋', fields: [] },
  지출결의서: {
    emoji: '💳',
    fields: [
      { id: 'f_amount', label: '지출 금액 (원)', type: 'number', placeholder: '예: 150000' },
      { id: 'f_purpose', label: '지출 목적', type: 'text', placeholder: '예: 팀 회식' },
      { id: 'f_date', label: '지출 일자', type: 'date', placeholder: '' },
      { id: 'f_account', label: '지출 계정과목', type: 'text', placeholder: '예: 복리후생비' },
    ],
  },
  연차신청서: {
    emoji: '🌴',
    fields: [
      { id: 'f_leave_type', label: '휴가 종류', type: 'text', placeholder: '예: 연차, 오전 반차, 오후 반차' },
      { id: 'f_start_date', label: '시작일', type: 'date', placeholder: '' },
      { id: 'f_end_date', label: '종료일', type: 'date', placeholder: '' },
      { id: 'f_days', label: '신청 일수', type: 'number', placeholder: '예: 1' },
    ],
  },
  출장신청서: {
    emoji: '✈️',
    fields: [
      { id: 'f_dest', label: '출장지', type: 'text', placeholder: '예: 서울 강남구' },
      { id: 'f_start_date', label: '출발일', type: 'date', placeholder: '' },
      { id: 'f_end_date', label: '복귀일', type: 'date', placeholder: '' },
      { id: 'f_budget', label: '예상 비용 (원)', type: 'number', placeholder: '예: 300000' },
    ],
  },
  구매요청서: {
    emoji: '🛒',
    fields: [
      { id: 'f_item', label: '구매 품목', type: 'text', placeholder: '예: 노트북 충전기' },
      { id: 'f_qty', label: '수량', type: 'number', placeholder: '예: 2' },
      { id: 'f_price', label: '단가 (원)', type: 'number', placeholder: '예: 50000' },
      { id: 'f_vendor', label: '거래처/구매처', type: 'text', placeholder: '예: 11번가' },
    ],
  },
  품의서: {
    emoji: '📦',
    fields: [
      { id: 'f_budget', label: '예산 금액 (원)', type: 'number', placeholder: '예: 2000000' },
      { id: 'f_deadline', label: '처리 기한', type: 'date', placeholder: '' },
    ],
  },
};

// 양식 선택 드롭다운용 순서 (원본 HTML 순서 유지)
export const FORM_ORDER = [
  '업무기안서',
  '지출결의서',
  '연차신청서',
  '품의서',
  '출장신청서',
  '구매요청서',
];

// 문서번호 생성 — 원본 genDocNumber() 그대로
export function genDocNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rnd = Math.floor(Math.random() * 900) + 100;
  return `NEX-${yy}${mm}${dd}-${rnd}`;
}
// 상세 뷰어용 — 필드 ID → 한글 라벨 (원본 fieldLabels)
export const FIELD_LABELS = {
  f_amount: '지출 금액',
  f_purpose: '지출 목적',
  f_date: '지출 일자',
  f_account: '계정과목',
  f_leave_type: '휴가 종류',
  f_start_date: '시작일',
  f_end_date: '종료일',
  f_days: '신청 일수',
  f_dest: '출장지',
  f_budget: '예산/비용',
  f_deadline: '처리 기한',
  f_item: '구매 품목',
  f_qty: '수량',
  f_price: '단가',
  f_vendor: '구매처',
};

// 날짜+시간 포맷 (원본 fmtDateTime)
export function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')}`;
}
export function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}