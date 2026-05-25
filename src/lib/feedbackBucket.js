// lib/feedbackBucket.js
// 부서명/입사일을 "큰 버킷"으로 묶는 함수.
//
// 왜 필요한가:
//   회사 부서가 '백엔드 2팀' 같이 세분화되어 있으면, 그 팀의 인원이 적을 때
//   "부서: 백엔드 2팀, 작성일: 5월 20일" 만으로도 작성자 식별이 가능해진다.
//   → 큰 버킷('엔지니어링')으로 묶어서 익명성을 보장한다.
//
// 회사마다 부서 구조가 다르므로 이 매핑은 환경에 맞게 조정해야 함.

/* 부서명 → 버킷 매핑 규칙.
   소문자 substring 매칭. 위에서부터 첫 매치 사용. */
const DEPT_RULES = [
  { match: ['엔지니어', '개발', '백엔드', '프론트', 'devops', 'sre', 'qa', 'tech'], bucket: '엔지니어링' },
  { match: ['디자인', 'ux', 'ui', '브랜드'], bucket: '디자인' },
  { match: ['프로덕트', 'pm', 'po', '기획'], bucket: '프로덕트' },
  { match: ['마케팅', '그로스', 'cs', '커뮤니티'], bucket: '마케팅·CS' },
  { match: ['영업', 'sales', 'bd', '사업'], bucket: '영업·사업개발' },
  { match: ['인사', 'hr', '피플', 'people'], bucket: '경영지원·인사' },
  { match: ['재무', '회계', '법무', 'finance', 'legal', '경영지원'], bucket: '경영지원·인사' },
  { match: ['데이터', 'data', 'ai', 'ml', '리서치'], bucket: '데이터·리서치' },
];

/**
 * 부서명을 받아 익명성 보장용 큰 버킷으로 반환.
 * @param {string|null} dept
 * @returns {string} '엔지니어링' | '디자인' | ... | '기타'
 */
export function deptToBucket(dept) {
  if (!dept || typeof dept !== 'string') return '기타';
  const lower = dept.toLowerCase();
  for (const rule of DEPT_RULES) {
    if (rule.match.some((kw) => lower.includes(kw.toLowerCase()))) {
      return rule.bucket;
    }
  }
  return '기타';
}

/* 가능한 모든 버킷 목록 (필터 UI용) */
export const ALL_DEPT_BUCKETS = [
  '엔지니어링',
  '디자인',
  '프로덕트',
  '마케팅·CS',
  '영업·사업개발',
  '경영지원·인사',
  '데이터·리서치',
  '기타',
];

/**
 * 입사일을 받아 연차 버킷으로 반환.
 * profiles 테이블에 hire_date 가 있다면 사용. 없으면 null 반환 → 작성 시 입력 안 함.
 * @param {string|Date|null} hireDate
 * @returns {string|null}
 */
export function tenureToBucket(hireDate) {
  if (!hireDate) return null;
  const d = new Date(hireDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const years = (now - d) / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 1) return '1년 미만';
  if (years < 3) return '1-3년';
  if (years < 5) return '3-5년';
  return '5년+';
}

export const ALL_TENURE_BUCKETS = ['1년 미만', '1-3년', '3-5년', '5년+'];

/**
 * 오늘 날짜를 ISO week 문자열로 변환 ('2026-W20').
 * 일자 단위 추적을 막기 위해 주 단위로만 저장.
 */
export function currentISOWeek() {
  const d = new Date();
  // ISO week 계산
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * ISO week 문자열 → '몇 주 전' 형식의 표시용 문자열.
 */
export function formatWeek(weekStr) {
  if (!weekStr) return '';
  const current = currentISOWeek();
  if (weekStr === current) return '이번 주';
  const [cy, cw] = current.split('-W').map(Number);
  const [y, w] = weekStr.split('-W').map(Number);
  // 같은 해 안에서의 단순 계산 (연말 경계는 근사)
  const diff = (cy - y) * 52 + (cw - w);
  if (diff === 1) return '지난 주';
  if (diff > 1 && diff < 5) return `${diff}주 전`;
  if (diff >= 5) return `${weekStr}`;
  return weekStr;
}
