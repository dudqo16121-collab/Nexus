// config/companyEventTypes.js
// 회사 일정 카테고리 정의.

export const EVENT_CATEGORIES = [
  {
    value: 'workshop',
    label: '워크샵·합숙',
    icon: 'fa-bullseye',
    color: '#8338ec',
    description: '분기 워크샵, OKR 합숙 등',
  },
  {
    value: 'holiday',
    label: '휴일·휴무',
    icon: 'fa-umbrella-beach',
    color: '#f72585',
    description: '공휴일, 회사 휴무일',
  },
  {
    value: 'social',
    label: '회식·행사',
    icon: 'fa-pizza-slice',
    color: '#ec4899',
    description: '회식, 가족 동반 행사',
  },
  {
    value: 'training',
    label: '교육·세미나',
    icon: 'fa-graduation-cap',
    color: '#4361ee',
    description: '정기 교육, 외부 세미나',
  },
  {
    value: 'meeting',
    label: '전사 미팅',
    icon: 'fa-bullhorn',
    color: '#06d6a0',
    description: '전사 발표회, 분기 미팅',
  },
  {
    value: 'announcement',
    label: '공지',
    icon: 'fa-circle-info',
    color: '#ff9f1c',
    description: '일반 공지사항',
  },
];

export function getEventCategoryMeta(value) {
  return EVENT_CATEGORIES.find((c) => c.value === value) || EVENT_CATEGORIES[5];
}