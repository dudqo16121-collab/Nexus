// components/groupware/ActivityStream.jsx
// 회사 전체 실시간 활동 스트림 — ActivityFeedContext 재활용.
//
// 6개 소스 통합 (게시판/위키/결재/칭찬/일정/교육).
// 타임라인 스타일 + 카테고리 필터 + 클릭 시 페이지 이동.

import { useNavigate } from 'react-router-dom';
import {
  useActivityFeed,
  ACTIVITY_TYPES,
} from '../../contexts/ActivityFeedContext';

/* 상대 시간 */
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

export default function ActivityStream() {
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

  /* 카테고리 옵션 — 카운트 0 이면 숨김 */
  const categoryOptions = [
    { value: 'all',      label: '전체 활동' },
    { value: 'post',     label: '게시판' },
    { value: 'wiki',     label: '위키' },
    { value: 'approval', label: '결재' },
    { value: 'kudos',    label: '칭찬' },
    { value: 'schedule', label: '일정' },
    { value: 'training', label: '교육' },
  ].filter((o) => o.value === 'all' || (counts[o.value] || 0) > 0);

  const handleClick = (item) => {
    const meta = ACTIVITY_TYPES[item.type];
    if (!meta?.link) return;
    const link = meta.link(item.raw);
    if (link) navigate(link);
  };

  return (
    <div className="bento-card card-activity-stream">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-timeline" style={{ color: 'var(--primary-color)' }} />
          실시간 활동 스트림
          {allItems.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
              }}
            >
              · 최근 {allItems.length}건
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={refresh}
            title="새로고침"
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              fontSize: '0.85rem',
            }}
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
          </button>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'inherit',
              fontSize: '0.85rem',
            }}
          >
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stream-list">
        {loading && items.length === 0 ? (
          <div className="stream-empty">
            <i className="fa-solid fa-spinner fa-spin" />
            <p>활동을 불러오는 중...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="stream-empty">
            <i className="fa-regular fa-folder-open" />
            <p>
              {category === 'all'
                ? '아직 활동 내역이 없어요.'
                : '이 카테고리의 활동이 없어요.'}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const meta = ACTIVITY_TYPES[item.type] || ACTIVITY_TYPES.post;
            return (
              <div
                key={item.id}
                className="stream-item-v2"
                onClick={() => handleClick(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleClick(item);
                }}
              >
                {/* 타임라인 점 */}
                <div
                  className="stream-dot"
                  style={{ background: meta.color, color: '#fff' }}
                >
                  <i className={`fa-solid ${meta.icon}`} />
                </div>

                {/* 본문 */}
                <div className="stream-body">
                  <div className="stream-line1">
                    <span
                      className="stream-category"
                      style={{ color: meta.color }}
                    >
                      [{meta.label}]
                    </span>
                    <span className="stream-text">{item.text}</span>
                  </div>
                  {item.subText && (
                    <span className="stream-sub">{item.subText}</span>
                  )}
                  <div className="stream-foot">
                    <span>{timeAgo(item.time)}</span>
                    <span className="stream-sep">·</span>
                    <span>by {item.actor}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}