// 자료실 메인 헤더 — 현재 뷰 제목 + 검색 + 정렬 + 뷰 모드 전환.

import { useResource } from '../../contexts/ResourceContext';

const QUICK_VIEW_TITLES = {
  all:       { label: '전체 파일',     icon: 'fa-folder-open',      color: '#4361ee' },
  recent:    { label: '최근 본 파일',  icon: 'fa-clock-rotate-left', color: '#06d6a0' },
  favorites: { label: '즐겨찾기',      icon: 'fa-star',             color: '#fbbf24' },
  mine:      { label: '내 파일',       icon: 'fa-user',             color: '#8338ec' },
  shared:    { label: '공유받은 파일', icon: 'fa-share-nodes',      color: '#f59e0b' },
};

export default function ResourceMainHeader() {
  const {
    keyword, setKeyword,
    activeView, viewMode, setViewMode,
    categories, filteredResources,
  } = useResource();

  /* 현재 뷰 정보 */
  let viewInfo = QUICK_VIEW_TITLES[activeView];
  if (!viewInfo) {
    const cat = categories.find((c) => c.id === activeView);
    if (cat) {
      viewInfo = { label: cat.name, icon: cat.icon, color: cat.color };
    }
  }
  if (!viewInfo) viewInfo = QUICK_VIEW_TITLES.all;

  return (
    <header className="resource-main-header">
      <div className="resource-main-title">
        <div
          className="resource-main-title-icon"
          style={{ background: `${viewInfo.color}15`, color: viewInfo.color }}
        >
          <i className={`fa-solid ${viewInfo.icon}`} />
        </div>
        <div>
          <h2>{viewInfo.label}</h2>
          <span>{filteredResources.length}개의 파일</span>
        </div>
      </div>

      <div className="resource-main-controls">
        {/* 검색 */}
        <div className="resource-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="파일명·설명으로 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {keyword && (
            <button
              type="button"
              className="resource-search-clear"
              onClick={() => setKeyword('')}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        {/* 뷰 모드 전환 */}
        <div className="resource-view-toggle">
          <button
            type="button"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            title="그리드 뷰"
          >
            <i className="fa-solid fa-grip" />
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            title="리스트 뷰"
          >
            <i className="fa-solid fa-list" />
          </button>
        </div>
      </div>
    </header>
  );
}