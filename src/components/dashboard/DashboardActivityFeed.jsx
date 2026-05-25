// components/dashboard/DashboardActivityFeed.jsx
// D4 — 대시보드 통합 활동 피드 위젯.
// 좌측 컬럼에 배치. 카테고리 필터 + 시간순 타임라인.

import { useNavigate } from 'react-router-dom';
import {
  useActivityFeed,
  ACTIVITY_TYPES,
  ACTIVITY_CATEGORIES,
} from '../../contexts/ActivityFeedContext';
import { SkeletonList } from '../common/Skeleton';

/* 상대 시간 — '방금 전' / 'N분 전' / 'N시간 전' / 'N일 전' / 날짜 */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function DashboardActivityFeed() {
  const navigate = useNavigate();
  const {
    items,
    allItems,
    loading,
    category,
    setCategory,
    counts,
    refresh,
  } = useActivityFeed();

  const handleClick = (item) => {
    const meta = ACTIVITY_TYPES[item.type];
    if (!meta?.link) return;
    const link = meta.link(item.raw);
    if (link) navigate(link);
  };

  return (
    <div className="panel activity-feed-panel">
      <div className="panel-header">
        <h2>
          <i className="fa-solid fa-timeline" style={{ color: 'var(--primary-color)' }} />
          {' '}최근 활동
          {allItems.length > 0 && (
            <span className="activity-feed-total">{allItems.length}</span>
          )}
        </h2>
        <button
          type="button"
          className="activity-feed-refresh"
          onClick={refresh}
          disabled={loading}
          title="새로고침"
          aria-label="활동 피드 새로고침"
        >
          <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
        </button>
      </div>

      {/* 카테고리 필터 chips */}
      <div className="activity-feed-filters">
        {ACTIVITY_CATEGORIES.map((c) => {
          const cnt = counts[c.value] || 0;
          const active = category === c.value;
          return (
            <button
              key={c.value}
              type="button"
              className={`activity-feed-chip ${active ? 'active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
              {cnt > 0 && <span className="activity-feed-chip-count">{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* 타임라인 */}
      <div className="activity-feed-list">
        {loading && items.length === 0 ? (
          <SkeletonList count={5} />
        ) : items.length === 0 ? (
          <div className="activity-feed-empty">
            <i className="fa-regular fa-folder-open" />
            <p>최근 활동이 없어요.</p>
          </div>
        ) : (
          items.map((item) => {
            const meta = ACTIVITY_TYPES[item.type] || ACTIVITY_TYPES.post;
            return (
              <div
                key={item.id}
                className="activity-feed-item"
                onClick={() => handleClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClick(item);
                }}
              >
                <div
                  className="activity-feed-icon"
                  style={{
                    background: `${meta.color}15`,
                    color: meta.color,
                  }}
                >
                  <i className={`fa-solid ${meta.icon}`} />
                </div>

                <div className="activity-feed-body">
                  <div className="activity-feed-line1">
                    <span className="activity-feed-actor">{item.actor}</span>
                    <span className="activity-feed-sep">·</span>
                    <span
                      className="activity-feed-type"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    {item.subText && (
                      <>
                        <span className="activity-feed-sep">·</span>
                        <span className="activity-feed-sub">{item.subText}</span>
                      </>
                    )}
                  </div>
                  <div className="activity-feed-text">{item.text}</div>
                </div>

                <div className="activity-feed-time">{timeAgo(item.time)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}