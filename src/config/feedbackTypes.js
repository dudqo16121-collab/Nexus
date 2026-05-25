// config/feedbackTypes.js
// FeedbackBox 메타 데이터 단일 출처 (leaveTypes.js / expenseTypes.js 와 동일 패턴).

/* ─── 카테고리 ───────────────────────────────────────────────────── */
export const FEEDBACK_CATEGORIES = [
  { value: 'culture',    label: '문화·분위기',  emoji: '🌱', color: '#06d6a0' },
  { value: 'leadership', label: '리더십·소통',  emoji: '🧭', color: '#4361ee' },
  { value: 'process',    label: '업무 프로세스', emoji: '⚙️', color: '#ffd166' },
  { value: 'wellbeing',  label: '복지·근무환경', emoji: '💚', color: '#ec4899' },
  { value: 'product',    label: '제품·서비스',  emoji: '🛠', color: '#8338ec' },
  { value: 'workspace',  label: '사무실·시설',  emoji: '🏢', color: '#f59e0b' },
  { value: 'etc',        label: '기타',         emoji: '💭', color: '#94a3b8' },
];

export function getCategoryMeta(value) {
  return FEEDBACK_CATEGORIES.find((c) => c.value === value) || FEEDBACK_CATEGORIES[6];
}

/* ─── 감정 (작성자가 직접 선택) ─────────────────────────────────── */
export const FEEDBACK_SENTIMENTS = [
  { value: 'positive',   label: '긍정',   emoji: '😊', color: '#06d6a0' },
  { value: 'suggestion', label: '제안',   emoji: '💡', color: '#4361ee' },
  { value: 'neutral',    label: '중립',   emoji: '😐', color: '#94a3b8' },
  { value: 'negative',   label: '아쉬움', emoji: '😔', color: '#f72585' },
];

export function getSentimentMeta(value) {
  return FEEDBACK_SENTIMENTS.find((s) => s.value === value) || FEEDBACK_SENTIMENTS[2];
}

/* ─── 대상 범위 ──────────────────────────────────────────────────── */
export const FEEDBACK_SCOPES = [
  { value: 'company', label: '전사',      icon: 'fa-building' },
  { value: 'team',    label: '특정 부서', icon: 'fa-users' },
  { value: 'leader',  label: '리더십',    icon: 'fa-user-tie' },
];

export function getScopeMeta(value) {
  return FEEDBACK_SCOPES.find((s) => s.value === value) || FEEDBACK_SCOPES[0];
}

/* ─── 상태 ───────────────────────────────────────────────────────── */
export const FEEDBACK_STATUSES = [
  { value: 'open',         label: '접수',     color: '#94a3b8' },
  { value: 'acknowledged', label: '확인',     color: '#4361ee' },
  { value: 'in_progress',  label: '논의 중',  color: '#ffd166' },
  { value: 'resolved',     label: '반영 완료', color: '#06d6a0' },
  { value: 'archived',     label: '보관',     color: '#64748b' },
];

export function getStatusMeta(value) {
  return FEEDBACK_STATUSES.find((s) => s.value === value) || FEEDBACK_STATUSES[0];
}

/* ─── 필터 옵션 ──────────────────────────────────────────────────── */
export const SORT_OPTIONS = [
  { value: 'latest',   label: '최신순' },
  { value: 'popular',  label: '공감 많은순' },
  { value: 'oldest',   label: '오래된순' },
  { value: 'unanswered', label: '미응답 우선' },
];

export const FILTER_STATUS_OPTIONS = [
  { value: 'all',         label: '전체' },
  { value: 'open',        label: '접수' },
  { value: 'acknowledged', label: '확인' },
  { value: 'in_progress', label: '논의 중' },
  { value: 'resolved',    label: '반영 완료' },
];

/* ─── 익명성 보호 임계치 ────────────────────────────────────────── */
// 통계 표시 시 그룹 내 N명 미만이면 표시하지 않음 (역추적 방지)
export const ANONYMITY_THRESHOLD = 5;

// 본문이 너무 짧으면 식별 위험 → 경고
export const MIN_BODY_LENGTH = 20;
export const MAX_BODY_LENGTH = 5000;
export const MIN_TITLE_LENGTH = 3;
export const MAX_TITLE_LENGTH = 120;

/* ─── 응답 SLA (관리자 알림 기준) ────────────────────────────────── */
export const SLA_WARNING_DAYS = 7;   // 7일 미응답 → 노란 경고
export const SLA_DANGER_DAYS = 14;   // 14일 미응답 → 빨간 경고
