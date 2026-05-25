// config/pulseTypes.js
// 펄스 서베이 메타 데이터.

/* ─── 질문 타입 ─────────────────────────────────────────────── */
export const QUESTION_TYPES = [
  {
    value: 'scale',
    label: '척도 (1~10)',
    icon: 'fa-sliders',
    description: '에너지·만족도 같은 정량 지표에 적합',
  },
  {
    value: 'choice',
    label: '객관식',
    icon: 'fa-list-check',
    description: '선택지 중에서 고르기',
  },
  {
    value: 'text',
    label: '자유 서술',
    icon: 'fa-pen',
    description: '자유롭게 의견 작성',
  },
];

/* ─── 설문 상태 ─────────────────────────────────────────────── */
export const SURVEY_STATUSES = [
  { value: 'draft',    label: '초안',    color: '#94a3b8' },
  { value: 'active',   label: '진행 중', color: '#06d6a0' },
  { value: 'closed',   label: '종료',    color: '#4361ee' },
  { value: 'archived', label: '보관',    color: '#64748b' },
];

export function getStatusMeta(value) {
  return SURVEY_STATUSES.find((s) => s.value === value) || SURVEY_STATUSES[0];
}

/* ─── 척도 라벨 프리셋 ───────────────────────────────────────── */
export const SCALE_PRESETS = [
  { label: '동의 정도', min_label: '전혀 아니다', max_label: '매우 그렇다' },
  { label: '만족도',    min_label: '매우 불만족', max_label: '매우 만족' },
  { label: '빈도',      min_label: '전혀 없음',   max_label: '매우 자주' },
  { label: '난이도',    min_label: '매우 쉬움',   max_label: '매우 어려움' },
  { label: '커스텀',    min_label: '',           max_label: '' },
];

/* ─── 기본 템플릿 ───────────────────────────────────────────── */
export const SURVEY_TEMPLATES = [
  {
    title: '분기 펄스 체크',
    description: '이번 분기 동안의 전반적인 경험을 짧게 여쭤봐요.',
    questions: [
      {
        id: 'q1',
        type: 'scale',
        label: '이번 분기, 전반적인 업무 만족도는?',
        required: true,
        scale_min: 1, scale_max: 10,
        scale_min_label: '매우 불만족', scale_max_label: '매우 만족',
      },
      {
        id: 'q2',
        type: 'scale',
        label: '동료와의 협업은 잘 이뤄지고 있나요?',
        required: true,
        scale_min: 1, scale_max: 10,
        scale_min_label: '거의 안 됨', scale_max_label: '매우 잘 됨',
      },
      {
        id: 'q3',
        type: 'choice',
        label: '가장 개선이 필요한 영역은?',
        required: true,
        options: ['업무 프로세스', '커뮤니케이션', '복지·근무환경', '리더십', '도구·시스템', '기타'],
      },
      {
        id: 'q4',
        type: 'text',
        label: '회사가 알아야 할 가장 중요한 것 한 가지가 있다면?',
        required: false,
      },
    ],
  },
  {
    title: '온보딩 만족도 (입사 30일)',
    description: '입사 후 한 달, 어떻게 적응하고 계신가요?',
    questions: [
      {
        id: 'q1',
        type: 'scale',
        label: '온보딩 과정에 대한 전반적인 만족도',
        required: true,
        scale_min: 1, scale_max: 10,
        scale_min_label: '매우 불만족', scale_max_label: '매우 만족',
      },
      {
        id: 'q2',
        type: 'choice',
        label: '가장 도움이 되었던 것은?',
        required: true,
        options: ['Buddy/멘토', '온보딩 문서', '팀 점심', 'IT 셋업', '교육 세션', '기타'],
      },
      {
        id: 'q3',
        type: 'text',
        label: '온보딩을 더 좋게 만들 제안이 있다면?',
        required: false,
      },
    ],
  },
];

/* ─── 익명성 임계치 — Phase 3와 동일 ─────────────────────────── */
export const ANONYMITY_THRESHOLD = 5;

/* ─── 새 질문 객체 생성 헬퍼 ─────────────────────────────────── */
export function makeQuestion(type = 'scale') {
  const id = `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const base = { id, type, label: '', required: false };
  if (type === 'scale') {
    return {
      ...base,
      scale_min: 1, scale_max: 10,
      scale_min_label: '전혀 아니다',
      scale_max_label: '매우 그렇다',
    };
  }
  if (type === 'choice') {
    return { ...base, options: ['선택 1', '선택 2'] };
  }
  return base; // text
}