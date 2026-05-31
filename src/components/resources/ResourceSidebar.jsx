// 자료실 좌측 사이드바 — 빠른 보기 + 카테고리.

import { useResource } from '../../contexts/ResourceContext';

const QUICK_VIEWS = [
  { id: 'all',       label: '전체 파일',  icon: 'fa-folder-open',   color: '#4361ee' },
  { id: 'recent',    label: '최근 본 파일', icon: 'fa-clock-rotate-left', color: '#06d6a0' },
  { id: 'favorites', label: '즐겨찾기',   icon: 'fa-star',          color: '#fbbf24' },
  { id: 'mine',      label: '내 파일',    icon: 'fa-user',          color: '#8338ec' },
  { id: 'shared',    label: '공유받은 파일', icon: 'fa-share-nodes', color: '#f59e0b' },
];

export default function ResourceSidebar() {
  const {
    activeView, setActiveView,
    categories, categoryCounts, sidebarCounts,
    openUploadModal,
  } = useResource();

  return (
    <aside className="resource-sidebar">
      {/* 업로드 버튼 */}
      <button
        type="button"
        className="resource-upload-cta"
        onClick={openUploadModal}
      >
        <i className="fa-solid fa-cloud-arrow-up" />
        파일 업로드
      </button>

      {/* 빠른 보기 */}
      <div className="resource-sidebar-section">
        <h4>빠른 보기</h4>
        <div className="resource-sidebar-list">
          {QUICK_VIEWS.map((view) => {
            const isActive = activeView === view.id;
            const count = sidebarCounts[view.id] || 0;
            return (
              <button
                key={view.id}
                type="button"
                className={`resource-sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveView(view.id)}
              >
                <i className={`fa-solid ${view.icon}`} style={{ color: view.color }} />
                <span>{view.label}</span>
                {count > 0 && <em>{count}</em>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 카테고리 */}
      <div className="resource-sidebar-section">
        <h4>카테고리</h4>
        <div className="resource-sidebar-list">
          {categories.length === 0 ? (
            <div className="resource-sidebar-empty">
              <i className="fa-regular fa-folder-open" />
              <span>카테고리가 없습니다</span>
            </div>
          ) : (
            categories.map((cat) => {
              const isActive = activeView === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`resource-sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveView(cat.id)}
                  style={isActive ? { '--cat-color': cat.color } : undefined}
                >
                  <i className={`fa-solid ${cat.icon}`} style={{ color: cat.color }} />
                  <span>{cat.name}</span>
                  {count > 0 && <em>{count}</em>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}