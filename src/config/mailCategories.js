// src/config/mailCategories.js
// 메일 카테고리 정의 — 사이드바, 목록, 작성 모달에서 공용 사용.

export const MAIL_CATEGORIES = [
  {
    id: 'general',
    label: '업무',
    icon: 'fa-briefcase',
    color: '#4361ee',
    desc: '일반 업무 메일',
  },
  {
    id: 'notice',
    label: '공지',
    icon: 'fa-bullhorn',
    color: '#8338ec',
    desc: '공지사항 / 안내',
  },
  {
    id: 'mention',
    label: '멘션',
    icon: 'fa-at',
    color: '#06d6a0',
    desc: '나를 언급한 메일',
  },
  {
    id: 'system',
    label: '시스템',
    icon: 'fa-gear',
    color: '#ff9f1c',
    desc: '시스템 자동 알림',
  },
];

export function getCategoryMeta(id) {
  return MAIL_CATEGORIES.find((c) => c.id === id) || MAIL_CATEGORIES[0];
}