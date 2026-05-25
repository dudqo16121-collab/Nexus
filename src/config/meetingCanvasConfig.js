// config/meetingCanvasConfig.js
// 회의 캔버스 메타 데이터.

/* ─── 회의 단계 ──────────────────────────────────────────── */
export const MEETING_PHASES = [
  { value: 'pre',      label: '회의 전',  icon: 'fa-clipboard-list', color: '#4361ee' },
  { value: 'live',     label: '회의 중',  icon: 'fa-microphone',     color: '#ec4899' },
  { value: 'post',     label: '회의 후',  icon: 'fa-circle-check',   color: '#06d6a0' },
  { value: 'archived', label: '보관',     icon: 'fa-box-archive',    color: '#94a3b8' },
];

export function getPhaseMeta(value) {
  return MEETING_PHASES.find((p) => p.value === value) || MEETING_PHASES[0];
}

/* ─── 참석자 역할 ────────────────────────────────────────── */
export const ATTENDEE_ROLES = [
  { value: 'host',        label: '주최자',   icon: 'fa-crown' },
  { value: 'attendee',    label: '참석',     icon: 'fa-user' },
  { value: 'optional',    label: '선택',     icon: 'fa-user-clock' },
  { value: 'notify_only', label: '통지만',   icon: 'fa-bell' },
];

export const ATTENDEE_STATUSES = [
  { value: 'pending',  label: '응답 대기', color: '#94a3b8' },
  { value: 'accepted', label: '참석',     color: '#06d6a0' },
  { value: 'declined', label: '불참',     color: '#f72585' },
  { value: 'attended', label: '참석 완료', color: '#4361ee' },
  { value: 'absent',   label: '결석',     color: '#94a3b8' },
];

/* ─── 안건 상태 ──────────────────────────────────────────── */
export const AGENDA_STATUSES = [
  { value: 'pending',    label: '대기',     color: '#94a3b8' },
  { value: 'discussing', label: '논의 중',   color: '#ec4899' },
  { value: 'done',       label: '완료',     color: '#06d6a0' },
  { value: 'postponed',  label: '연기',     color: '#ffd166' },
];

/* ─── 결정/액션 타입 ─────────────────────────────────────── */
export const DECISION_TYPES = [
  {
    value: 'decision',
    label: '결정',
    icon: 'fa-gavel',
    color: '#4361ee',
    placeholder: '회의에서 내려진 결정사항을 적으세요',
  },
  {
    value: 'action',
    label: '액션',
    icon: 'fa-bolt',
    color: '#06d6a0',
    placeholder: '담당자가 처리해야 할 액션 아이템',
  },
  {
    value: 'question',
    label: '미해결 질문',
    icon: 'fa-circle-question',
    color: '#ffd166',
    placeholder: '회의에서 답을 못 찾은 질문',
  },
  {
    value: 'note',
    label: '메모',
    icon: 'fa-note-sticky',
    color: '#94a3b8',
    placeholder: '기록해두고 싶은 사항',
  },
];

export function getDecisionTypeMeta(value) {
  return DECISION_TYPES.find((d) => d.value === value) || DECISION_TYPES[3];
}

/* ─── 첨부 종류 ──────────────────────────────────────────── */
export const ATTACHMENT_KINDS = [
  { value: 'wiki_link',    label: '위키 문서',  icon: 'fa-book' },
  { value: 'board_post',   label: '게시글',     icon: 'fa-comments' },
  { value: 'project',      label: '프로젝트',   icon: 'fa-diagram-project' },
  { value: 'approval',     label: '결재 문서',  icon: 'fa-stamp' },
  { value: 'external_url', label: '외부 링크',  icon: 'fa-link' },
  { value: 'file',         label: '파일',       icon: 'fa-paperclip' },
];

export function getAttachmentKindMeta(value) {
  return ATTACHMENT_KINDS.find((a) => a.value === value) || ATTACHMENT_KINDS[4];
}

/* ─── 기본값 ─────────────────────────────────────────────── */
export const DEFAULT_DURATION_MIN = 30;
export const MIN_TITLE_LENGTH = 1;
export const MAX_TITLE_LENGTH = 300;