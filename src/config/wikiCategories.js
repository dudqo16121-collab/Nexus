// config/wikiCategories.js
// 위키 카테고리 — 고정 7개. 사이드바에 표시되는 순서대로.

export const WIKI_CATEGORIES = [
  { value: '전사',       icon: 'fa-building',    color: '#4361ee' },
  { value: '개발팀',     icon: 'fa-code',        color: '#06d6a0' },
  { value: '디자인팀',   icon: 'fa-palette',     color: '#ec4899' },
  { value: '인사팀',     icon: 'fa-users',       color: '#f59e0b' },
  { value: '운영가이드', icon: 'fa-book-open',   color: '#8338ec' },
  { value: '회의록',     icon: 'fa-clipboard',   color: '#3aafa9' },
  { value: '기타',       icon: 'fa-folder',      color: '#6b7280' },
];

export const WIKI_CATEGORY_META = Object.fromEntries(
  WIKI_CATEGORIES.map((c) => [c.value, c])
);

export function getCategoryMeta(value) {
  return WIKI_CATEGORY_META[value] || WIKI_CATEGORY_META['기타'];
}