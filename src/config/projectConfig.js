// config/projectConfig.js
// 프로젝트 관리 관련 메타 데이터 단일 출처.

export const TASK_COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'doing', title: '진행중' },
  { id: 'review', title: '리뷰' },
  { id: 'done', title: '완료' },
];

export const PRIORITY_META = {
  low: { label: '낮음', icon: '🔵' },
  medium: { label: '보통', icon: '⚪' },
  high: { label: '높음', icon: '🟠' },
  urgent: { label: '긴급', icon: '🔴' },
};

export const PROJECT_COLORS = [
  '#4361ee',
  '#f72585',
  '#ff9f1c',
  '#4cc9f0',
  '#06d6a0',
  '#8338ec',
];

/* 프로젝트 상태 옵션 — 'completed' 추가 */
export const PROJECT_STATUS_OPTIONS = [
  { value: 'todo',        label: '진행 예정' },
  { value: 'in-progress', label: '진행 중' },
  { value: 'done',        label: '완료' },          // 기존 호환
  { value: 'completed',   label: '완료 (보고서)' }, // 보고서 생성된 정식 완료
];

/* 프로젝트 리스트 좌측 탭 필터 — 'completed' 추가 */
export const PROJECT_FILTERS = [
  { id: 'all',       label: '전체' },
  { id: 'mine',      label: '내 프로젝트' },
  { id: 'active',    label: '진행중' },
  { id: 'completed', label: '완료됨' },   // ✨ NEW
];

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v) {
  return !!v && UUID_RE.test(String(v));
}

/* ─── 완료된 프로젝트인지 판단 헬퍼 ────────────────────────── */
export function isCompletedProject(p) {
  return p?.status === 'completed' || !!p?.completed_at;
}