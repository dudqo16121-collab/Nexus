// pages/Bookmarks.jsx
// 전체 즐겨찾기 관리 페이지. 종류별 필터 + 핀 토글 + 삭제.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookmark, BOOKMARK_KIND_META } from '../contexts/BookmarkContext';
import { useToast } from '../contexts/ToastContext';
import { SkeletonList } from '../components/common/Skeleton';

const ALL_KINDS = [
  { value: 'all', label: '전체' },
  ...Object.entries(BOOKMARK_KIND_META).map(([k, m]) => ({
    value: k,
    label: m.label,
    icon: m.icon,
    color: m.color,
  })),
];

export default function Bookmarks() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    bookmarks,
    pinnedBookmarks,
    unpinnedBookmarks,
    loading,
    togglePin,
    removeBookmark,
    grouped,
  } = useBookmark();

  const [filter, setFilter] = useState('all');

  const filtered =
    filter === 'all' ? bookmarks : bookmarks.filter((b) => b.kind === filter);

  const handleRemove = async (b) => {
    if (!confirm(`"${b.title}" 즐겨찾기를 제거할까요?`)) return;
    const res = await removeBookmark(b.id);
    if (res.ok) toast.info('제거되었어요');
  };

  const handlePin = async (b) => {
    await togglePin(b.id);
  };

  const handleGo = (b) => {
    navigate(b.link);
  };

  return (
    <section id="view-bookmarks" style={{ padding: '24px 28px' }}>
      <header className="bookmarks-header">
        <h2>
          <i className="fa-solid fa-star" style={{ color: '#fbbf24' }} />{' '}
          즐겨찾기
        </h2>
        <p className="bookmarks-tagline">
          중요한 게시글·문서·페이지를 모아두고 빠르게 접근하세요.
        </p>
      </header>

      {/* 종류 필터 */}
      <div className="bookmarks-filters">
        {ALL_KINDS.map((k) => {
          const count =
            k.value === 'all' ? bookmarks.length : (grouped[k.value] || []).length;
          const active = filter === k.value;
          if (k.value !== 'all' && count === 0) return null;
          return (
            <button
              key={k.value}
              type="button"
              className={`bookmarks-chip ${active ? 'active' : ''}`}
              onClick={() => setFilter(k.value)}
            >
              {k.icon && (
                <i
                  className={`fa-solid ${k.icon}`}
                  style={!active && k.color ? { color: k.color } : undefined}
                />
              )}
              <span>{k.label}</span>
              {count > 0 && <span className="bookmarks-chip-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* 리스트 */}
      <div className="bookmarks-list">
        {loading ? (
          <SkeletonList count={6} />
        ) : filtered.length === 0 ? (
          <div className="bookmarks-empty">
            <i className="fa-regular fa-star" />
            <p>
              {filter === 'all'
                ? '아직 즐겨찾기한 항목이 없어요.'
                : '이 종류에는 즐겨찾기가 없어요.'}
            </p>
            <p className="bookmarks-empty-sub">
              게시글, 위키 문서, 결재 양식, 회의실 등 어디서든 ⭐ 버튼으로 추가할 수 있어요.
            </p>
          </div>
        ) : (
          filtered.map((b) => {
            const meta = BOOKMARK_KIND_META[b.kind] || BOOKMARK_KIND_META.page;
            return (
              <div
                key={b.id}
                className={`bookmarks-item ${b.pinned ? 'is-pinned' : ''}`}
              >
                <div
                  className="bookmarks-icon"
                  style={{
                    background: `${b.color || meta.color}15`,
                    color: b.color || meta.color,
                  }}
                  onClick={() => handleGo(b)}
                  role="button"
                  tabIndex={0}
                >
                  <i className={`fa-solid ${b.icon || meta.icon}`} />
                </div>

                <div
                  className="bookmarks-body"
                  onClick={() => handleGo(b)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleGo(b);
                  }}
                >
                  <div className="bookmarks-title-row">
                    {b.pinned && (
                      <i
                        className="fa-solid fa-thumbtack"
                        style={{ color: '#fbbf24', fontSize: '0.75rem' }}
                        title="고정됨"
                      />
                    )}
                    <span className="bookmarks-kind">{meta.label}</span>
                    <span className="bookmarks-title">{b.title}</span>
                  </div>
                  {b.subtitle && (
                    <div className="bookmarks-subtitle">{b.subtitle}</div>
                  )}
                </div>

                <div className="bookmarks-actions">
                  <button
                    type="button"
                    className={`bookmarks-action ${b.pinned ? 'active' : ''}`}
                    onClick={() => handlePin(b)}
                    title={b.pinned ? '고정 해제' : '상단 고정'}
                  >
                    <i className="fa-solid fa-thumbtack" />
                  </button>
                  <button
                    type="button"
                    className="bookmarks-action bookmarks-action-danger"
                    onClick={() => handleRemove(b)}
                    title="제거"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}