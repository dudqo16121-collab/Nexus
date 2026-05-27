// components/layout/ActivityFeedPanel.jsx
// 글로벌 활동 피드 슬라이드 패널 — Topbar 우측 시계 아이콘으로 토글.
//
// 기존 DashboardActivityFeed 의 마크업을 슬라이드 패널 컨테이너로 옮긴 버전.
// ActivityFeedContext 가 이미 전역이므로 데이터는 그대로 활용.

import { useEffect } from 'react';
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

export default function ActivityFeedPanel({ isOpen, onClose }) {
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

  /* ESC 로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* 열렸을 때 body 스크롤 잠금 안 함 — 패널만 띄우는 거니까 */

  const handleClick = (item) => {
    const meta = ACTIVITY_TYPES[item.type];
    if (!meta?.link) return;
    const link = meta.link(item.raw);
    if (link) {
      navigate(link);
      onClose(); // 이동 후 패널 닫기
    }
  };

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`afp-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 슬라이드 패널 */}
      <aside
        className={`afp-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="최근 활동"
      >
        {/* 헤더 */}
        <header className="afp-header">
          <h3 className="afp-title">
            <i className="fa-solid fa-timeline" style={{ color: 'var(--primary-color)' }} />
            최근 활동
            {allItems.length > 0 && (
              <span className="afp-total">{allItems.length}</span>
            )}
          </h3>
          <div className="afp-header-actions">
            <button
              type="button"
              className="afp-icon-btn"
              onClick={refresh}
              disabled={loading}
              title="새로고침"
              aria-label="활동 피드 새로고침"
            >
              <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
            </button>
            <button
              type="button"
              className="afp-icon-btn"
              onClick={onClose}
              title="닫기"
              aria-label="패널 닫기"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </header>

        {/* 카테고리 필터 칩 */}
        <div className="afp-filters">
          {ACTIVITY_CATEGORIES.map((c) => {
            const cnt = counts[c.value] || 0;
            const active = category === c.value;
            if (c.value !== 'all' && cnt === 0) return null; // 0건은 숨김
            return (
              <button
                key={c.value}
                type="button"
                className={`afp-chip ${active ? 'active' : ''}`}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
                {cnt > 0 && <span className="afp-chip-count">{cnt}</span>}
              </button>
            );
          })}
        </div>

        {/* 본문 — 타임라인 */}
        <div className="afp-body">
          {loading && items.length === 0 ? (
            <div style={{ padding: 16 }}>
              <SkeletonList count={6} />
            </div>
          ) : items.length === 0 ? (
            <div className="afp-empty">
              <i className="fa-regular fa-folder-open" />
              <p>최근 활동이 없어요</p>
            </div>
          ) : (
            <div className="afp-list">
              {items.map((item) => {
                const meta = ACTIVITY_TYPES[item.type] || ACTIVITY_TYPES.post;
                return (
                  <div
                    key={item.id}
                    className="afp-item"
                    onClick={() => handleClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleClick(item);
                    }}
                  >
                    <div
                      className="afp-item-icon"
                      style={{
                        background: `${meta.color}15`,
                        color: meta.color,
                      }}
                    >
                      <i className={`fa-solid ${meta.icon}`} />
                    </div>

                    <div className="afp-item-body">
                      <div className="afp-item-line1">
                        <span className="afp-item-actor">{item.actor}</span>
                        <span className="afp-item-sep">·</span>
                        <span
                          className="afp-item-type"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {item.subText && (
                          <>
                            <span className="afp-item-sep">·</span>
                            <span className="afp-item-sub">{item.subText}</span>
                          </>
                        )}
                      </div>
                      <div className="afp-item-text">{item.text}</div>
                      <div className="afp-item-time">{timeAgo(item.time)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}