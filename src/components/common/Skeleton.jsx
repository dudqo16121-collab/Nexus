// components/common/Skeleton.jsx
// C5 — 통일된 로딩 스켈레톤.
// 사용처별 프리셋 제공: List / Card / Table / Text / Grid / Avatar.
//
// 사용법:
//   {loading ? <SkeletonList count={5} /> : items.map(...)}
//   {loading ? <SkeletonCard /> : <ActualCard {...} />}


/* 기본 블록 — width/height 만 지정해서 어디든 사용 가능 */
export function Skeleton({
  width = '100%',
  height = '14px',
  circle = false,
  radius,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : radius ?? '6px',
        ...style,
      }}
    />
  );
}

/* 텍스트 라인 N줄 — 마지막 줄은 짧게 */
export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="12px"
          width={i === lines - 1 ? lastWidth : '100%'}
        />
      ))}
    </div>
  );
}

/* 리스트 패턴 — 아바타 + 2줄 텍스트 */
export function SkeletonList({ count = 5, showAvatar = true }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          {showAvatar && <Skeleton width="36px" height="36px" circle />}
          <div className="skeleton-list-body">
            <Skeleton height="13px" width="40%" />
            <Skeleton height="10px" width="80%" />
          </div>
          <Skeleton height="10px" width="40px" />
        </div>
      ))}
    </div>
  );
}

/* 카드 그리드 패턴 — 교육, 자료, INJOY Hub 등 */
export function SkeletonCardGrid({ count = 6, minWidth = 240 }) {
  return (
    <div
      className="skeleton-card-grid"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <Skeleton height="120px" radius="10px 10px 0 0" />
          <div className="skeleton-card-body">
            <Skeleton height="14px" width="70%" />
            <Skeleton height="10px" width="100%" />
            <Skeleton height="10px" width="50%" />
            <div className="skeleton-card-footer">
              <Skeleton height="24px" width="60px" radius="12px" />
              <Skeleton height="24px" width="40px" radius="12px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* 테이블 행 패턴 */
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              height="14px"
              width={c === 0 ? '50%' : c === cols - 1 ? '40%' : '70%'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* 박스 + 제목 + 텍스트 — 위젯 / 패널 자리표시 */
export function SkeletonPanel({ titleWidth = '40%', lines = 3 }) {
  return (
    <div className="skeleton-panel">
      <Skeleton height="18px" width={titleWidth} />
      <div className="skeleton-panel-body">
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

/* 통계 카드 줄 — 대시보드 KPI 등 */
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="skeleton-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <Skeleton width="44px" height="44px" radius="12px" />
          <div className="skeleton-stat-body">
            <Skeleton height="20px" width="50%" />
            <Skeleton height="10px" width="80%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* 풀스크린 — 라우트 가드용 */
export function SkeletonFullScreen({ label = '불러오는 중...' }) {
  return (
    <div className="skeleton-fullscreen">
      <div className="skeleton-fullscreen-spinner">
        <div className="skeleton-fullscreen-dot" />
        <div className="skeleton-fullscreen-dot" />
        <div className="skeleton-fullscreen-dot" />
      </div>
      <p>{label}</p>
    </div>
  );
}

/* 인라인 — 작은 영역에서 "로딩 중" 표시 */
export function SkeletonInline({ label = '불러오는 중...', size = 'md' }) {
  return (
    <div className={`skeleton-inline skeleton-inline-${size}`}>
      <i className="fa-solid fa-spinner fa-spin" />
      <span>{label}</span>
    </div>
  );
}

export default Skeleton;