// config/projectReportConfig.js
// 프로젝트 완료 보고서 — 섹션 정의 + 기본 템플릿 + 자동 채우기 헬퍼.

/* ─── 보고서 섹션 — 사용자가 편집하는 필드들 ────────────────── */
export const REPORT_SECTIONS = [
  {
    field: 'goals',
    label: '🎯 목표',
    placeholder:
      '이 프로젝트로 무엇을 달성하려 했나요?\n예: 모바일 앱 첫 출시 / 결제 전환율 15% 개선 / 신규 입사자 온보딩 시간 50% 단축',
    rows: 4,
    required: true,
  },
  {
    field: 'achievements',
    label: '🏆 주요 성과',
    placeholder:
      '실제로 달성한 결과를 적어주세요. 가능하면 숫자로.\n예: ✓ 안드로이드/iOS 동시 출시\n     ✓ DAU 1만 명 달성\n     ✓ 결제 전환율 11.3% → 14.8%',
    rows: 5,
    required: true,
  },
  {
    field: 'milestones',
    label: '📍 주요 마일스톤',
    placeholder:
      '시간 순으로 주요 단계와 일자를 적어주세요.\n예:\n• 4/1 - 기획 완료\n• 4/15 - 베타 출시\n• 5/30 - 정식 출시',
    rows: 5,
  },
  {
    field: 'issues',
    label: '⚠️ 이슈와 해결 과정',
    placeholder:
      '진행 중 마주한 큰 어려움과 어떻게 해결했는지.\n예: API 응답 지연 발생 → 캐싱 도입으로 평균 응답 300ms → 80ms',
    rows: 5,
  },
  {
    field: 'learnings',
    label: '💡 배운 점',
    placeholder:
      '다음 프로젝트에 적용하고 싶은 교훈.\n예: 외부 의존성은 PoC 단계에서 미리 검증해야 한다.',
    rows: 4,
  },
  {
    field: 'next_steps',
    label: '🚀 다음 단계',
    placeholder:
      '후속 작업이나 추가로 필요한 것이 있다면.\n예: v1.1 기능 백로그 작성 필요 / 운영 인력 1명 추가 채용',
    rows: 4,
  },
];

/* ─── 새 보고서의 빈 폼 ─────────────────────────────────────── */
export function emptyReport() {
  return {
    goals: '',
    achievements: '',
    milestones: '',
    issues: '',
    learnings: '',
    next_steps: '',
  };
}

/* ─── 프로젝트 데이터로 스냅샷 생성 ─────────────────────────── */
export function buildSnapshot(project, tasks = [], members = []) {
  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const completionRate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  return {
    title: project.title,
    description: project.description,
    color: project.color,
    priority: project.priority,
    start_date: project.start_date,
    end_date: project.end_date,
    owner_name: project.owner_name || null,
    member_count: members.length,
    member_names: members.map((m) => m.full_name || m.name || '익명'),
    tasks_total: tasksTotal,
    tasks_done: tasksDone,
    completion_rate: completionRate,
    /* 컬럼별 카운트 */
    tasks_by_status: tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {}),
    /* 기간 계산 */
    duration_days: (() => {
      if (!project.start_date || !project.end_date) return null;
      const s = new Date(project.start_date);
      const e = new Date(project.end_date);
      return Math.ceil((e - s) / 86400_000);
    })(),
    /* 보고서 작성 시점 */
    snapshot_at: new Date().toISOString(),
  };
}