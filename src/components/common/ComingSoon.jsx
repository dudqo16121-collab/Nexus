// components/common/ComingSoon.jsx
// 준비 중인 페이지를 위한 "그럴듯한 표지" 컴포넌트.
// 단순 안내가 아니라 그 페이지가 어떤 기능을 할지 미리보기를 제공.

const PRESETS = {
  mail: {
    icon: 'fa-envelope-open-text',
    color: '#4361ee',
    title: '사내 메일함',
    tagline: '중요한 소식이 한 곳에',
    description: '부서 공지, 시스템 알림, 외부 메일이 통합된 메일함을 준비하고 있어요.',
    features: [
      { icon: 'fa-inbox', label: '통합 받은편지함' },
      { icon: 'fa-paper-plane', label: '내부/외부 메일 발송' },
      { icon: 'fa-tag', label: '자동 라벨링 & 필터' },
      { icon: 'fa-magnifying-glass', label: '강력한 검색' },
    ],
  },
  training: {
    icon: 'fa-graduation-cap',
    color: '#f72585',
    title: '교육/연수 관리',
    tagline: '성장하는 팀, 성장하는 회사',
    description: '필수 교육과 자기계발 과정을 한곳에서 신청하고 이수 현황을 관리하세요.',
    features: [
      { icon: 'fa-list-check', label: '교육 과정 카탈로그' },
      { icon: 'fa-clipboard-check', label: '신청 & 승인 워크플로' },
      { icon: 'fa-certificate', label: '이수증 자동 발급' },
      { icon: 'fa-chart-line', label: '연간 교육 통계' },
    ],
  },
  injoyhub: {
    icon: 'fa-trophy',
    color: '#ff9f1c',
    title: 'INJOY Hub',
    tagline: '함께라서 더 즐거운 회사',
    description: '사내 동호회, 사내 이벤트, 임직원 추천 콘텐츠가 모이는 공간이에요.',
    features: [
      { icon: 'fa-people-group', label: '동호회 모집 & 가입' },
      { icon: 'fa-bullhorn', label: '사내 이벤트 일정' },
      { icon: 'fa-lightbulb', label: '추천 콘텐츠 큐레이션' },
      { icon: 'fa-star', label: '월간 우수사원 소개' },
    ],
  },
  wellbeing: {
    icon: 'fa-heart-pulse',
    color: '#06d6a0',
    title: 'Well-being',
    tagline: '건강한 일상, 건강한 회사',
    description: '임직원 복지 안내와 건강 관리 가이드를 한곳에 모았어요.',
    features: [
      { icon: 'fa-hand-holding-heart', label: '복지 혜택 안내' },
      { icon: 'fa-spa', label: '심리 상담 예약' },
      { icon: 'fa-dumbbell', label: '사내 피트니스 클럽' },
      { icon: 'fa-utensils', label: '구내식당 메뉴 & 영양 정보' },
    ],
  },
  logs: {
    icon: 'fa-bug',
    color: '#8338ec',
    title: '시스템 로그',
    tagline: '운영 상태를 한눈에',
    description: '서버 이벤트, 에러 로그, 사용자 활동을 실시간으로 모니터링할 수 있어요.',
    features: [
      { icon: 'fa-server', label: '실시간 서버 상태' },
      { icon: 'fa-triangle-exclamation', label: '에러 알림 & 추적' },
      { icon: 'fa-clock-rotate-left', label: '활동 로그 검색' },
      { icon: 'fa-shield-halved', label: '보안 이벤트 모니터링' },
    ],
  },
  default: {
    icon: 'fa-hammer',
    color: '#4361ee',
    title: '준비 중',
    tagline: '곧 만나요',
    description: '더 멋진 모습으로 곧 찾아올 페이지예요.',
    features: [],
  },
};

export default function ComingSoon({ preset = 'default', title }) {
  const cfg = PRESETS[preset] || PRESETS.default;
  /* title prop 이 넘어오면 preset 의 title 을 오버라이드 */
  const displayTitle = title || cfg.title;

  return (
    <div className="coming-soon">
      <div
        className="coming-soon-badge"
        style={{ background: `${cfg.color}15`, color: cfg.color, borderColor: `${cfg.color}40` }}
      >
        <i className="fa-solid fa-hammer" /> 준비 중인 기능
      </div>

      <div className="coming-soon-icon-wrap" style={{ background: `${cfg.color}10`, color: cfg.color }}>
        <i className={`fa-solid ${cfg.icon}`} />
      </div>

      <h1 className="coming-soon-title">{displayTitle}</h1>
      <p className="coming-soon-tagline" style={{ color: cfg.color }}>
        {cfg.tagline}
      </p>
      <p className="coming-soon-description">{cfg.description}</p>

      {cfg.features.length > 0 && (
        <>
          <div className="coming-soon-divider">
            <span>이런 기능이 추가될 예정이에요</span>
          </div>
          <div className="coming-soon-features">
            {cfg.features.map((f, i) => (
              <div key={i} className="coming-soon-feature">
                <div
                  className="coming-soon-feature-icon"
                  style={{ background: `${cfg.color}15`, color: cfg.color }}
                >
                  <i className={`fa-solid ${f.icon}`} />
                </div>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="coming-soon-footer">
        업데이트 소식은 사내 공지를 통해 안내드릴게요 ✨
      </div>
    </div>
  );
}