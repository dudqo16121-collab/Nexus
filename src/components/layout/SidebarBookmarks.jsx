// components/layout/SidebarBookmarks.jsx
// Sidebar 상단의 "내 즐겨찾기" 섹션.
// 핀 고정 + 일반 분리. 접기/펴기 가능.

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useBookmark, BOOKMARK_KIND_META } from '../../contexts/BookmarkContext';

const COLLAPSED_KEY = 'nexus_bookmarks_collapsed';

export default function SidebarBookmarks({ sidebarCollapsed }) {
  const navigate = useNavigate();
  const { pinnedBookmarks, unpinnedBookmarks, togglePin, removeBookmark } = useBookmark();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === '1'
  );

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSED_KEY, !v ? '1' : '0');
      return !v;
    });
  };

  /* 사이드바 자체가 접혀있으면 즐겨찾기 영역 숨김 */
  if (sidebarCollapsed) return null;

  /* 표시 개수 — 핀은 다, 일반은 5개까지 */
  const visiblePinned = pinnedBookmarks;
  const visibleNormal = unpinnedBookmarks.slice(0, 5);
  const hiddenCount = unpinnedBookmarks.length - visibleNormal.length;

  const total = pinnedBookmarks.length + unpinnedBookmarks.length;
  if (total === 0) return null;

  const renderItem = (b) => {
    const meta = BOOKMARK_KIND_META[b.kind] || BOOKMARK_KIND_META.page;
    const iconColor = b.color || meta.color;
    return (
      <li key={b.id} className="sb-bookmark-item">
        <NavLink to={b.link} className="sb-bookmark-link" title={b.title}>
          <i
            className={`fa-solid ${b.icon || meta.icon} sb-bookmark-icon`}
            style={{ color: iconColor }}
          />
          <span className="sb-bookmark-title">{b.title}</span>
          {b.pinned && (
            <i className="fa-solid fa-thumbtack sb-bookmark-pin" />
          )}
        </NavLink>
      </li>
    );
  };

  return (
    <div className="sb-bookmarks">
      <button
        type="button"
        className="sb-bookmarks-header"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
      >
        <span>
          <i className="fa-solid fa-star" style={{ color: '#fbbf24' }} />
          즐겨찾기
          <span className="sb-bookmarks-count">{total}</span>
        </span>
        <i
          className={`fa-solid fa-chevron-down sb-bookmarks-chev ${
            collapsed ? '' : 'rotated'
          }`}
        />
      </button>

      {!collapsed && (
        <ul className="sb-bookmarks-list">
          {visiblePinned.map(renderItem)}
          {visiblePinned.length > 0 && visibleNormal.length > 0 && (
            <li className="sb-bookmarks-divider" aria-hidden="true" />
          )}
          {visibleNormal.map(renderItem)}
          {hiddenCount > 0 && (
            <li className="sb-bookmark-item">
              <button
                type="button"
                className="sb-bookmark-more"
                onClick={() => navigate('/bookmarks')}
              >
                <i className="fa-solid fa-ellipsis" />
                <span>{hiddenCount}개 더 보기</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}