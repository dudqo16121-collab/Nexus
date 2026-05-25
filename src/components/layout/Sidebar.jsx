import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMessenger } from '../../contexts/MessengerContext';
import { useApprovalBadge } from '../../hooks/useApprovalBadge';
import { MAIN_NAV } from '../../config/navigation';
import ProfileModal from '../modals/ProfileModal';
import SidebarBookmarks from './SidebarBookmarks';

const COLLAPSED_KEY = 'nexus_sb_collapsed';

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const { unreadCount, open: openMessenger } = useMessenger();
  const approvalCount = useApprovalBadge();
  const location = useLocation();
const navigate = useNavigate();
  /* 프로필/관리자 모달 */
  const [profileOpen, setProfileOpen] = useState(false);

  /* 사이드바 접기/펴기 (localStorage 영구 저장) */
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === '1'
  );
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  /* 어떤 그룹이 펼쳐져 있는지 */
  const [openGroups, setOpenGroups] = useState(() => {
    /* 초기엔 현재 경로의 부모 그룹이 자동으로 열림 */
    const open = {};
    MAIN_NAV.forEach((item) => {
      if (item.type === 'group') {
        const hasActive = item.children?.some((c) =>
          location.pathname.startsWith(c.to)
        );
        if (hasActive) open[item.id] = true;
      }
    });
    return open;
  });

  const toggleGroup = (groupId) => {
    if (collapsed) {
      /* 접힌 상태에서 그룹 클릭 시 자동으로 펼침 */
      setCollapsed(false);
    }
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  /* 뱃지 카운트 매핑 */
  const getBadge = (item) => {
    if (item.badge === 'approval' && approvalCount > 0) {
      return approvalCount > 99 ? '99+' : approvalCount;
    }
    return null;
  };

  /* 관리자 권한 체크 */
  const isAdmin = profile?.is_admin === true;

  /* 메뉴 항목 렌더링 */
  const renderItem = (item) => {
    /* 관리자 전용 메뉴 필터링 */
    if (item.adminOnly && !isAdmin) return null;

    /* 그룹 (서브메뉴 있음) */
    if (item.type === 'group') {
      const isOpen = openGroups[item.id];
      const hasActiveChild = item.children?.some((c) =>
        location.pathname.startsWith(c.to)
      );

      return (
        <li key={item.id}>
          <div
            className={`nav-item has-submenu ${hasActiveChild ? 'open' : ''}`}
            onClick={() => toggleGroup(item.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="nav-text-container">
              <i className={`fa-solid ${item.icon} nav-icon`}></i>
              <span>{item.label}</span>
            </div>
            <i
              className={`fa-solid fa-chevron-down submenu-toggle ${isOpen ? 'rotated' : ''}`}
            ></i>
          </div>
          <ul className={`submenu ${isOpen ? 'open' : ''}`}>
            {item.children?.map((child) => renderItem(child))}
          </ul>
        </li>
      );
    }

    /* 일반 링크 */
    const badge = getBadge(item);
    return (
      <li key={item.id}>
        <NavLink
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'active' : ''}`
          }
        >
          <i
            className={`fa-solid ${item.icon} nav-icon`}
            style={item.iconColor ? { color: item.iconColor } : undefined}
          ></i>
          <span>{item.label}</span>
          {badge != null && <span className="nav-badge">{badge}</span>}
        </NavLink>
      </li>
    );
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* 브랜드 */}
      <div className="brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-layer-group"></i>
          <span>NEXUS</span>
        </div>
        <i
          className="fa-solid fa-bars toggle-btn"
          onClick={() => setCollapsed((v) => !v)}
          title="메뉴 접기/펴기"
        ></i>
      </div>
 <SidebarBookmarks sidebarCollapsed={collapsed} />
      {/* 메뉴 리스트 */}
      <ul className="nav-list">
        {MAIN_NAV.map((item) => renderItem(item))}

        {/* 메신저 (라우팅 X, 토글) */}
        <li>
          <button
            className="nav-item"
            onClick={openMessenger}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <i className="fa-solid fa-comment-dots nav-icon"></i>
            <span>메신저</span>
            {unreadCount > 0 && (
              <span className="nav-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </li>
      </ul>

      {/* 관리자 버튼 — /admin 페이지로 이동 */}
  {isAdmin && (
    <div id="admin-menu" style={{ display: 'block' }}>
      <button 
        className="btn-admin" 
        type="button" 
        onClick={() => navigate('/admin')}
      >
        <i className="fa-solid fa-gears"></i>
        <span>시스템 전체관리</span>
      </button>
    </div>
  )}

      {/* 사용자 푸터 — 아바타/이름 클릭 시 프로필 모달 */}
      <div className="user-footer">
        <div
          className="avatar"
          role="button"
          tabIndex={0}
          onClick={() => setProfileOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setProfileOpen(true); }}
          style={{
            cursor: 'pointer',
            background: profile?.avatar_url
              ? `url('${profile.avatar_url}') center/cover`
              : `url('https://bhlpzukxvweiyucckqiv.supabase.co/storage/v1/object/sign/Public/logo.png') center/cover`,
          }}
          title="프로필 관리"
        />
        <div
          className="user-info"
          role="button"
          tabIndex={0}
          onClick={() => setProfileOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setProfileOpen(true); }}
          style={{ cursor: 'pointer' }}
          title="프로필 관리"
        >
          <p id="display-name">{profile?.full_name || '사용자'}</p>
          <p id="user-dept">{profile?.department || '-'}</p>
        </div>
        <button id="logout-btn" type="button" title="로그아웃" onClick={signOut}>
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>

      {/* 모달들 */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

    </aside>
  );
}