// components/layout/Topbar.jsx
// 전역 헤더 — 좌측 브랜드 / 우측 활동피드 + 알림 + 다크모드.

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification, NOTIF_TYPES } from '../../contexts/NotificationContext';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { useActivityFeed } from '../../contexts/ActivityFeedContext';
import ActivityFeedPanel from './ActivityFeedPanel';
import BookmarksPanel from './BookmarksPanel';
import QuickMemoPanel from './QuickMemoPanel';
import { useBookmark } from '../../contexts/BookmarkContext';

export default function Topbar() {
  const [isDark, setIsDark] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('theme') === 'dark'
  );
  const [activityOpen, setActivityOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <>
      <header className="nexus-topbar">
        <h2 className="nexus-topbar-title">
          <i className="fa-solid fa-cube" style={{ color: 'var(--primary-color)', marginRight: 8 }} />
          NEXUS 그룹웨어
        </h2>

        <div className="nexus-topbar-actions">
          <QuickMemoButton onClick={() => setMemoOpen(true)} />
          <BookmarksButton onClick={() => setBookmarksOpen(true)} />
          <ActivityFeedButton onClick={() => setActivityOpen(true)} />
          <NotificationBell />

          <button
            type="button"
            className="nexus-topbar-icon"
            onClick={() => setIsDark((v) => !v)}
            title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            aria-label="다크모드 토글"
          >
            <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} />
          </button>
        </div>
      </header>

      <ActivityFeedPanel
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
      <BookmarksPanel
        isOpen={bookmarksOpen}
        onClose={() => setBookmarksOpen(false)}
      />
      <QuickMemoPanel
        isOpen={memoOpen}
        onClose={() => setMemoOpen(false)}
      />
    </>
  );
}

/* ⭐ 즐겨찾기 버튼 — 카운트 배지 */
function BookmarksButton({ onClick }) {
  const { bookmarks } = useBookmark();
  const count = bookmarks?.length || 0;
  return (
    <button
      type="button"
      className="nexus-topbar-icon"
      onClick={onClick}
      title="즐겨찾기"
      aria-label="즐겨찾기 보기"
    >
      <i className="fa-solid fa-star" />
      {count > 0 && (
        <span className="topbar-count-badge">{count > 99 ? '99+' : count}</span>
      )}
    </button>
  );
}

/* 📝 빠른 메모 버튼 */
function QuickMemoButton({ onClick }) {
  return (
    <button
      type="button"
      className="nexus-topbar-icon"
      onClick={onClick}
      title="빠른 메모"
      aria-label="빠른 메모 보기"
    >
      <i className="fa-solid fa-note-sticky" />
    </button>
  );
}

/* 🕓 활동 피드 버튼 — 새 활동 있으면 빨간 점 */
function ActivityFeedButton({ onClick }) {
  const { allItems } = useActivityFeed();

  /* '새 활동' 판단 — localStorage 에 마지막 본 시각 저장.
     클릭 시 갱신해서 점이 사라지게. */
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (!allItems || allItems.length === 0) {
      setHasNew(false);
      return;
    }
    const lastSeenIso = localStorage.getItem('nexus_activity_last_seen');
    const lastSeen = lastSeenIso ? new Date(lastSeenIso).getTime() : 0;
    const newest = new Date(allItems[0]?.time || 0).getTime();
    setHasNew(newest > lastSeen);
  }, [allItems]);

  const handleClick = () => {
    /* 클릭한 시점을 마지막 본 시각으로 저장 */
    localStorage.setItem('nexus_activity_last_seen', new Date().toISOString());
    setHasNew(false);
    onClick();
  };

  return (
    <button
      type="button"
      className="nexus-topbar-icon afp-trigger"
      onClick={handleClick}
      title="최근 활동"
      aria-label="최근 활동 보기"
    >
      <i className="fa-solid fa-timeline" />
      {hasNew && <span className="afp-dot" aria-hidden="true" />}
    </button>
  );
}

/* 🔔 알림 종 + 드롭다운 — 기존 그대로 */
function NotificationBell() {
  const {
    items, unreadCount, dropdownOpen, setDropdownOpen,
    markAsRead, markAllAsRead, removeOne, clearAll,
  } = useNotification();
  const { members } = useOrgChart() || { members: [] };
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen, setDropdownOpen]);

  const handleClickItem = (n) => {
    if (!n.read_at) markAsRead(n.id);
    if (n.link) {
      setDropdownOpen(false);
      navigate(n.link);
    }
  };

  const findUser = (id) => members.find((u) => u.id === id);

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="nexus-topbar-icon notif-bell"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        title="알림"
        aria-label="알림 보기"
      >
        <i className="fa-solid fa-bell" />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {dropdownOpen && (
        <div className="notif-dropdown" role="dialog" aria-label="알림 목록">
          <header className="notif-dropdown-head">
            <strong>알림 {unreadCount > 0 && <span>({unreadCount})</span>}</strong>
            <div className="notif-head-actions">
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} title="모두 읽음">
                  <i className="fa-solid fa-check-double" />
                </button>
              )}
              {items.length > 0 && (
                <button type="button" onClick={clearAll} title="전체 삭제">
                  <i className="fa-solid fa-trash" />
                </button>
              )}
            </div>
          </header>

          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">
                <i className="fa-regular fa-bell-slash" />
                <p>새 알림이 없어요</p>
              </div>
            ) : (
              items.map((n) => {
                const actor = findUser(n.actor_id);
                return (
                  <div
                    key={n.id}
                    className={`notif-item ${n.read_at ? '' : 'unread'}`}
                    onClick={() => handleClickItem(n)}
                  >
                    <div
                      className="notif-icon-wrap"
                      style={{ background: `${n.color}15`, color: n.color }}
                    >
                      <i className={`fa-solid ${n.icon || 'fa-bell'}`} />
                    </div>
                    <div className="notif-body">
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <span className="notif-time">
                        {timeAgo(n.created_at)}
                        {actor && <> · {actor.full_name}</>}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="notif-remove"
                      onClick={(e) => { e.stopPropagation(); removeOne(n.id); }}
                      title="삭제"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}