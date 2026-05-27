// components/layout/BookmarksPanel.jsx
// 글로벌 즐겨찾기 슬라이드 패널 — Topbar 우측 ⭐ 아이콘으로 토글.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookmark, BOOKMARK_KIND_META } from '../../contexts/BookmarkContext';

/* 종류별 필터용 — 카운트 0 이면 자동 숨김 */
const KIND_TABS = [
  { value: 'all', label: '전체' },
  ...Object.entries(BOOKMARK_KIND_META).map(([key, meta]) => ({
    value: key,
    label: meta.label,
  })),
];

export default function BookmarksPanel({ isOpen, onClose }) {
  const navigate = useNavigate();
  const {
    bookmarks,
    pinnedBookmarks,
    unpinnedBookmarks,
    loading,
    togglePin,
    removeBookmark,
  } = useBookmark();

  const [kindFilter, setKindFilter] = useState('all');

  /* ESC 로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* 종류별 카운트 */
  const counts = {};
  bookmarks.forEach((b) => {
    counts[b.kind] = (counts[b.kind] || 0) + 1;
  });
  counts.all = bookmarks.length;

  /* 필터 적용 */
  const filterByKind = (list) =>
    kindFilter === 'all' ? list : list.filter((b) => b.kind === kindFilter);

  const filteredPinned = filterByKind(pinnedBookmarks);
  const filteredUnpinned = filterByKind(unpinnedBookmarks);

  const handleClick = (b) => {
    if (b.link) {
      navigate(b.link);
      onClose();
    }
  };

  const renderItem = (b) => {
    const meta = BOOKMARK_KIND_META[b.kind] || BOOKMARK_KIND_META.page;
    return (
      <div
        key={b.id}
        className="bmp-item"
        onClick={() => handleClick(b)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick(b);
        }}
      >
        <div
          className="bmp-item-icon"
          style={{
            background: `${b.color || meta.color}15`,
            color: b.color || meta.color,
          }}
        >
          <i className={`fa-solid ${b.icon || meta.icon}`} />
        </div>
        <div className="bmp-item-body">
          <div className="bmp-item-title">{b.title}</div>
          <div className="bmp-item-meta">
            <span className="bmp-item-kind">{meta.label}</span>
            {b.subtitle && (
              <>
                <span className="bmp-item-sep">·</span>
                <span className="bmp-item-sub">{b.subtitle}</span>
              </>
            )}
          </div>
        </div>
        <div className="bmp-item-actions">
          <button
            type="button"
            className={`bmp-item-btn ${b.pinned ? 'pinned' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              togglePin(b.id);
            }}
            title={b.pinned ? '핀 해제' : '핀 고정'}
          >
            <i className={`fa-solid fa-thumbtack ${b.pinned ? '' : 'fa-rotate-by'}`}
               style={b.pinned ? undefined : { '--fa-rotate-angle': '45deg' }} />
          </button>
          <button
            type="button"
            className="bmp-item-btn danger"
            onClick={(e) => {
              e.stopPropagation();
              removeBookmark(b.id);
            }}
            title="삭제"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`afp-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`afp-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="즐겨찾기"
      >
        {/* 헤더 */}
        <header className="afp-header">
          <h3 className="afp-title">
            <i className="fa-solid fa-star" style={{ color: '#fbbf24' }} />
            즐겨찾기
            {bookmarks.length > 0 && (
              <span className="afp-total">{bookmarks.length}</span>
            )}
          </h3>
          <div className="afp-header-actions">
            <button
              type="button"
              className="afp-icon-btn"
              onClick={() => {
                navigate('/bookmarks');
                onClose();
              }}
              title="전체 페이지 보기"
            >
              <i className="fa-solid fa-up-right-from-square" />
            </button>
            <button
              type="button"
              className="afp-icon-btn"
              onClick={onClose}
              title="닫기"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </header>

        {/* 종류별 필터 칩 */}
        <div className="afp-filters">
          {KIND_TABS.map((t) => {
            const cnt = counts[t.value] || 0;
            if (t.value !== 'all' && cnt === 0) return null;
            return (
              <button
                key={t.value}
                type="button"
                className={`afp-chip ${kindFilter === t.value ? 'active' : ''}`}
                onClick={() => setKindFilter(t.value)}
              >
                {t.label}
                {cnt > 0 && <span className="afp-chip-count">{cnt}</span>}
              </button>
            );
          })}
        </div>

        {/* 본문 */}
        <div className="afp-body">
          {loading ? (
            <div className="afp-empty">
              <i className="fa-solid fa-spinner fa-spin" />
              <p>로딩 중...</p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="afp-empty">
              <i className="fa-regular fa-star" />
              <p>아직 즐겨찾기한 항목이 없어요</p>
              <p style={{ fontSize: '0.78rem', marginTop: 6, opacity: 0.7 }}>
                게시글이나 문서에서 ⭐ 버튼을 눌러보세요
              </p>
            </div>
          ) : (
            <>
              {/* 핀 고정된 항목 */}
              {filteredPinned.length > 0 && (
                <div className="bmp-section">
                  <h4 className="bmp-section-title">
                    <i className="fa-solid fa-thumbtack" />
                    핀 고정 {filteredPinned.length}
                  </h4>
                  <div className="bmp-list">
                    {filteredPinned.map(renderItem)}
                  </div>
                </div>
              )}

              {/* 일반 항목 */}
              {filteredUnpinned.length > 0 && (
                <div className="bmp-section">
                  {filteredPinned.length > 0 && (
                    <h4 className="bmp-section-title">
                      <i className="fa-solid fa-star" />
                      전체 {filteredUnpinned.length}
                    </h4>
                  )}
                  <div className="bmp-list">
                    {filteredUnpinned.map(renderItem)}
                  </div>
                </div>
              )}

              {/* 필터된 결과 없을 때 */}
              {filteredPinned.length === 0 && filteredUnpinned.length === 0 && (
                <div className="afp-empty">
                  <i className="fa-regular fa-folder-open" />
                  <p>이 종류의 즐겨찾기가 없어요</p>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}