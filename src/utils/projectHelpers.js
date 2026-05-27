// utils/projectHelpers.js
// 프로젝트 페이지 전용 유틸 — 원본 script.js 의 ddayText / ddayClassOf /
// formatRelative / assigneeAvatar / renderMentions / escapeHtml 이관.

/* 마감일까지 D-Day 텍스트 — 원본 ddayText 그대로 */
export function ddayText(end) {
  if (!end) return '기한 없음';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(end);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff === 0) return 'D-Day';
  if (diff > 0) return 'D-' + diff;
  return 'D+' + Math.abs(diff);
}

/* D-Day 클래스 — 마감 임박/지남 표시용. 원본 ddayClassOf 이관.
   3일 이하 또는 지남: 'overdue' (style.css 의 .overdue 매칭) */
export function ddayClass(end) {
  if (!end) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(end);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'overdue';
  return '';
}

/* 오늘 + n일 → YYYY-MM-DD */
export function addDaysISO(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/* 상대 시간 — 원본 formatRelative 이관 (방금/N분 전/N시간 전 …) */
export function formatRelative(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return Math.floor(diff / 60) + '분 전';
  if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + '일 전';
  return new Date(iso).toLocaleDateString('ko-KR');
}

/* 담당자 아바타 URL — 원본 assigneeAvatar 이관.
   avatar_url 우선, 없으면 pravatar 대체. */
export function assigneeAvatar(u) {
  if (!u) return '';
  if (u.avatar_url) return u.avatar_url;
  if (u.avatar) return `https://i.pravatar.cc/150?img=${u.avatar}`;
  return `https://i.pravatar.cc/150?u=${u.id || 'x'}`;
}

/* 멘션 텍스트 → HTML 변환 — 원본 renderMentions 이관.
   @이름 부분을 <span class="mention"> 으로 감싼다.
   호출부에서 dangerouslySetInnerHTML 로 렌더. 입력은 반드시 escape 된 텍스트여야 함. */
export function mentionsToHtml(safeText) {
  return (safeText || '').replace(
    /@([\w가-힣]+)/g,
    '<span class="mention">@$1</span>'
  );
}

/* HTML escape — React 가 기본으로 escape 해주지만 dangerouslySetInnerHTML 사용 직전엔 필요 */
export function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}