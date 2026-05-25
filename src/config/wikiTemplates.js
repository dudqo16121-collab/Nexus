// config/wikiTemplates.js
// 위키 문서 템플릿 정의.
//
// 각 템플릿:
//   - id: 식별자
//   - name: 사용자에게 보이는 이름
//   - description: 간단 설명
//   - icon: FontAwesome 아이콘
//   - color: 강조 색
//   - category: 자동 설정될 카테고리
//   - tags: 자동 설정될 태그 배열
//   - title: 기본 제목 (날짜 등 동적 치환 가능 — {date}, {today})
//   - content: 본문 HTML (위키 에디터 형식)

/* 날짜 헬퍼 */
function fmtToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtTodayKR() {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function todayWeekday() {
  return ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];
}

/* 변수 치환 */
function fillVars(text) {
  if (!text) return '';
  return text
    .replace(/\{date\}/g, fmtToday())
    .replace(/\{today\}/g, fmtTodayKR())
    .replace(/\{weekday\}/g, todayWeekday());
}

/* ─────────────────────────────────────────────
   템플릿 목록
───────────────────────────────────────────── */

export const WIKI_TEMPLATES = [
  {
    id: 'blank',
    name: '빈 문서',
    description: '백지에서 시작합니다.',
    icon: 'fa-file',
    color: '#6b7280',
    category: '기타',
    tags: [],
    title: '새 문서',
    content: '',
  },

  {
    id: 'meeting',
    name: '회의록',
    description: '날짜 · 참석자 · 안건 · 결정사항 · 액션 아이템',
    icon: 'fa-users',
    color: '#4361ee',
    category: '회의록',
    tags: ['회의록'],
    title: '회의록 {date}',
    content: `
      <h1>회의록 {today} ({weekday})</h1>
      <h2>📌 기본 정보</h2>
      <ul>
        <li><strong>일시</strong>: {today} </li>
        <li><strong>장소</strong>: </li>
        <li><strong>참석자</strong>: </li>
        <li><strong>작성자</strong>: </li>
      </ul>
      <h2>🎯 안건</h2>
      <ol>
        <li>안건 1</li>
        <li>안건 2</li>
      </ol>
      <h2>💬 논의 내용</h2>
      <h3>안건 1</h3>
      <p>(논의 내용을 작성하세요)</p>
      <h3>안건 2</h3>
      <p>(논의 내용을 작성하세요)</p>
      <h2>✅ 결정 사항</h2>
      <ul>
        <li>결정 사항 1</li>
        <li>결정 사항 2</li>
      </ul>
      <h2>📋 액션 아이템</h2>
      <ul>
        <li>[ ] (담당자) - 할 일 - 마감일</li>
        <li>[ ] (담당자) - 할 일 - 마감일</li>
      </ul>
      <h2>📅 다음 회의</h2>
      <p>일시: <br/>안건: </p>
    `,
  },

  {
    id: 'project',
    name: '프로젝트 기획서',
    description: '배경 · 목표 · 범위 · 일정 · 리소스 · 위험요소',
    icon: 'fa-diagram-project',
    color: '#06d6a0',
    category: '전사',
    tags: ['프로젝트', '기획'],
    title: '프로젝트 기획서: ',
    content: `
      <h1>프로젝트 기획서</h1>
      <h2>📖 배경 및 필요성</h2>
      <p>(이 프로젝트를 왜 시작하는가? 어떤 문제를 해결하는가?)</p>
      <h2>🎯 목표</h2>
      <ul>
        <li>주요 목표 1</li>
        <li>주요 목표 2</li>
      </ul>
      <h3>성공 지표 (KPI)</h3>
      <ul>
        <li>지표 1: </li>
        <li>지표 2: </li>
      </ul>
      <h2>📦 범위</h2>
      <h3>포함</h3>
      <ul><li></li></ul>
      <h3>제외</h3>
      <ul><li></li></ul>
      <h2>📅 일정</h2>
      <ul>
        <li><strong>킥오프</strong>: </li>
        <li><strong>Phase 1</strong>: </li>
        <li><strong>Phase 2</strong>: </li>
        <li><strong>완료 목표</strong>: </li>
      </ul>
      <h2>👥 팀 구성</h2>
      <ul>
        <li>PM: </li>
        <li>개발: </li>
        <li>디자인: </li>
      </ul>
      <h2>⚠️ 위험 요소</h2>
      <ul>
        <li>위험 1 — 대응 방안</li>
      </ul>
      <h2>💰 예산</h2>
      <p></p>
    `,
  },

  {
    id: 'guide',
    name: '운영 가이드',
    description: '용도 · 단계별 절차 · 주의사항 · 자주 묻는 질문',
    icon: 'fa-book-open',
    color: '#8338ec',
    category: '운영가이드',
    tags: ['가이드'],
    title: '운영 가이드: ',
    content: `
      <h1>운영 가이드</h1>
      <h2>📌 개요</h2>
      <p>(이 가이드는 무엇에 대한 것인지 설명하세요)</p>
      <h2>🎯 대상 독자</h2>
      <ul>
        <li>이 가이드를 누가 봐야 하나요?</li>
      </ul>
      <h2>⚙️ 사전 준비</h2>
      <ul>
        <li>필요한 권한</li>
        <li>필요한 도구</li>
      </ul>
      <h2>📋 단계별 절차</h2>
      <h3>1. 첫 번째 단계</h3>
      <p></p>
      <h3>2. 두 번째 단계</h3>
      <p></p>
      <h3>3. 세 번째 단계</h3>
      <p></p>
      <h2>⚠️ 주의 사항</h2>
      <blockquote>(주의해야 할 사항이 있다면 여기에 작성)</blockquote>
      <h2>❓ 자주 묻는 질문 (FAQ)</h2>
      <h3>Q. 질문 1</h3>
      <p>A. 답변</p>
      <h3>Q. 질문 2</h3>
      <p>A. 답변</p>
      <h2>🔗 관련 문서</h2>
      <ul>
        <li>관련 문서를 [[ 로 링크하세요</li>
      </ul>
    `,
  },

  {
    id: 'retro',
    name: '회고록',
    description: 'Keep · Problem · Try 형식의 회고',
    icon: 'fa-rotate-right',
    color: '#f59e0b',
    category: '회의록',
    tags: ['회고'],
    title: '회고: ',
    content: `
      <h1>회고: </h1>
      <h2>📅 기본 정보</h2>
      <ul>
        <li><strong>회고 기간</strong>: ~ {today}</li>
        <li><strong>대상</strong>: (스프린트/프로젝트/주간 등)</li>
        <li><strong>참여자</strong>: </li>
      </ul>
      <h2>🟢 Keep — 잘한 점, 계속 유지할 것</h2>
      <ul>
        <li></li>
      </ul>
      <h2>🔴 Problem — 문제점, 어려웠던 점</h2>
      <ul>
        <li></li>
      </ul>
      <h2>🟡 Try — 다음에 시도해볼 것</h2>
      <ul>
        <li></li>
      </ul>
      <h2>💭 추가 의견</h2>
      <p></p>
      <h2>📋 액션 아이템</h2>
      <ul>
        <li>[ ] 할 일 — 담당자 — 마감일</li>
      </ul>
    `,
  },

  {
    id: 'api',
    name: 'API 문서',
    description: '엔드포인트 · 요청/응답 · 예제 · 에러',
    icon: 'fa-code',
    color: '#3aafa9',
    category: '개발팀',
    tags: ['API', '개발'],
    title: 'API 문서: ',
    content: `
      <h1>API 문서: </h1>
      <h2>📌 개요</h2>
      <p>(이 API의 역할)</p>
      <h2>🔗 엔드포인트</h2>
      <pre><code>METHOD /path/to/endpoint</code></pre>
      <h2>🔐 인증</h2>
      <p>(필요한 인증 방식 — Bearer Token, API Key 등)</p>
      <h2>📥 요청 (Request)</h2>
      <h3>Path Parameters</h3>
      <ul>
        <li><code>id</code> (string, required) — 설명</li>
      </ul>
      <h3>Query Parameters</h3>
      <ul>
        <li><code>page</code> (number, optional) — 페이지 번호</li>
      </ul>
      <h3>Body</h3>
      <pre><code>{
  "field1": "string",
  "field2": 123
}</code></pre>
      <h2>📤 응답 (Response)</h2>
      <h3>Success — 200 OK</h3>
      <pre><code>{
  "status": "ok",
  "data": { }
}</code></pre>
      <h2>🚨 에러 코드</h2>
      <ul>
        <li><code>400</code> — 잘못된 요청</li>
        <li><code>401</code> — 인증 실패</li>
        <li><code>404</code> — 리소스 없음</li>
        <li><code>500</code> — 서버 오류</li>
      </ul>
      <h2>💡 사용 예시</h2>
      <pre><code>curl -X POST https://api.example.com/v1/...</code></pre>
    `,
  },

  {
    id: 'one-on-one',
    name: '1:1 미팅',
    description: '근황 · 진행 · 피드백 · 다음 액션',
    icon: 'fa-user-group',
    color: '#ec4899',
    category: '인사팀',
    tags: ['1on1', '미팅'],
    title: '1:1 미팅 {date}',
    content: `
      <h1>1:1 미팅 — {today} ({weekday})</h1>
      <h2>📌 기본 정보</h2>
      <ul>
        <li><strong>대상</strong>: </li>
        <li><strong>일시</strong>: {today}</li>
      </ul>
      <h2>💭 근황 / 컨디션</h2>
      <p>(요즘 어떻게 지내는지)</p>
      <h2>📋 진행 중인 업무</h2>
      <ul>
        <li>업무 1 — 진행 상황 / 어려움</li>
        <li>업무 2</li>
      </ul>
      <h2>💡 피드백</h2>
      <h3>받은 피드백</h3>
      <p></p>
      <h3>드릴 피드백</h3>
      <p></p>
      <h2>🎯 목표 / 성장</h2>
      <p>(단기/중기 목표, 관심사)</p>
      <h2>🚧 블로커 / 도움 필요한 것</h2>
      <p></p>
      <h2>📋 다음 액션</h2>
      <ul>
        <li>[ ] 할 일</li>
      </ul>
    `,
  },

  {
    id: 'onboarding',
    name: '온보딩',
    description: '신규 입사자를 위한 안내 문서',
    icon: 'fa-hand-wave',
    color: '#ff9f1c',
    category: '인사팀',
    tags: ['온보딩', '입사'],
    title: '온보딩 가이드: ',
    content: `
      <h1>환영합니다! 👋</h1>
      <p>입사를 환영합니다. 이 문서는 새로 합류한 분께 필요한 정보를 안내합니다.</p>
      <h2>🏢 회사 소개</h2>
      <p>(미션, 비전, 핵심 가치)</p>
      <h2>👥 우리 팀</h2>
      <ul>
        <li>팀장: </li>
        <li>팀원: </li>
      </ul>
      <h2>💻 첫 주 체크리스트</h2>
      <ul>
        <li>[ ] 사내 메신저 가입</li>
        <li>[ ] 그룹웨어 계정 발급</li>
        <li>[ ] 개발 환경 세팅</li>
        <li>[ ] 보안 교육 이수</li>
      </ul>
      <h2>📚 꼭 알아야 할 것</h2>
      <ul>
        <li>출퇴근 시간 / 근무 정책</li>
        <li>휴가 신청 방법</li>
        <li>결재 프로세스</li>
      </ul>
      <h2>🔗 자주 쓰는 링크</h2>
      <ul>
        <li>(여기에 [[ 위키 링크들 ]] 을 추가하세요)</li>
      </ul>
      <h2>❓ 궁금한 점이 있다면</h2>
      <p>인사팀(hr@company.com) 또는 멘토에게 문의하세요.</p>
    `,
  },
];

/* 헬퍼 — 템플릿 가져오기 (변수 치환 적용) */
export function getTemplate(id) {
  const t = WIKI_TEMPLATES.find((x) => x.id === id);
  if (!t) return null;
  return {
    ...t,
    title: fillVars(t.title),
    content: fillVars(t.content).trim(),
  };
}