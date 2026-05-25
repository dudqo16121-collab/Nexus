/**
 * NEXUS 사이드바 메뉴 정의
 * 원본 Sidebar.js의 NAV_INDEX를 React Router용 라우트로 매핑
 */

export const MAIN_NAV = [
  {
    id: 'dashboard',
    type: 'link',
    to: '/',
    icon: 'fa-house',
    label: '대시보드',
    end: true, // 정확히 일치할 때만 active
  },
  {
    id: 'workspace',
    type: 'group',
    icon: 'fa-briefcase',
    label: '워크스페이스',
    children: [
      { id: 'project',  type: 'link', to: '/project',  icon: 'fa-diagram-project', label: '프로젝트 관리' },
      { id: 'resource', type: 'link', to: '/resource', icon: 'fa-folder-tree',     label: '자료실' },
    ],
  },
  {
    id: 'approval',
    type: 'link',
    to: '/approval',
    icon: 'fa-pen-nib',
    label: '전자 결재',
    badge: 'approval', // 결재 대기 뱃지 표시
  },
  {
    id: 'communication',
    type: 'group',
    icon: 'fa-comments',
    label: '커뮤니케이션',
    children: [
      { id: 'board',    type: 'link', to: '/board',    icon: 'fa-clipboard-list', label: '전사 게시판' },
      { id: 'mail',     type: 'link', to: '/mail',     icon: 'fa-envelope',       label: '메일함' },
      { id: 'orgchart', type: 'link', to: '/orgchart', icon: 'fa-sitemap',        label: '조직도' },
    ],
  },
  {
    id: 'operations',
    type: 'group',
    icon: 'fa-gear',
    label: '운영 지원',
children: [
      { id: 'schedule',    type: 'link', to: '/schedule',    icon: 'fa-calendar-days',  label: '일정 관리' },
      { id: 'leave',       type: 'link', to: '/leave',       icon: 'fa-calendar-check', label: '근태/연차 관리' },
      { id: 'expenses',    type: 'link', to: '/expenses',    icon: 'fa-receipt',        label: '법인카드 정산' },
    ],
  },
    {
    id: 'groupware',
    type: 'group',
    icon: 'fa-user',
    label: '그룹웨어',
children: [
      { id: 'meetingroom', type: 'link', to: '/meetingroom', icon: 'fa-people-roof',    label: '회의실 예약' },
      { id: 'meetings', type: 'link',  to: '/meetings',  icon: 'fa-microphone',  label: '회의 캔버스' },
      {id: 'decisions', type: 'link',to: '/decisions',icon: 'fa-gavel',label: '의사결정 추적' },
      { id: 'training',    type: 'link', to: '/training',    icon: 'fa-graduation-cap', label: '교육/연수 관리' },
    ],
  },
  
  {
    id: 'extra',
    type: 'group',
    icon: 'fa-shapes',
    label: '확장 시스템',
    children: [
      { id: 'wiki',      type: 'link', to: '/wiki',      icon: 'fa-book-open',  label: 'Wiki 지식베이스' },
      { id: 'groupware', type: 'link', to: '/groupware', icon: 'fa-users-gear', label: '협업 워크스페이스' },
      { id: 'injoyhub',  type: 'link', to: '/injoyhub',  icon: 'fa-trophy',     label: 'INJOY Hub' },
    ],
  },
  {id: 'wellbeing', type: 'link', to: '/wellbeing',  icon: 'fa-heart-pulse',  label: 'Well-being',  iconColor: '#06d6a0',},
  {  id: 'feedback',  type: 'link',  to: '/feedback',  icon: 'fa-comment-dots',  label: '익명 피드백',  iconColor: '#8338ec',},
  /* 관리자 전용 */
  {
    id: 'admin-tools',
    type: 'group',
    icon: 'fa-shield-halved',
    label: '관리자 도구',
    adminOnly: true,
    children: [
      { id: 'system-logs',    type: 'link', to: '/admin/logs',     icon: 'fa-bug',         label: '시스템 로그' },
      { id: 'orgchart-admin', type: 'link', to: '/admin/orgchart', icon: 'fa-users-gear',  label: '직원 관리' },
    ],
  },
];