// components/project/ProjectSidebar.jsx
// 좌측 사이드: 탭 필터 + 검색 + 프로젝트 리스트.
// 원본 renderProjectList + bindProjectListEvents 이관.

import { useProject } from '../../contexts/ProjectContext';
import { PROJECT_FILTERS, PRIORITY_META } from '../../config/projectConfig';
import { ddayText } from '../../utils/projectHelpers';

export default function ProjectSidebar() {
  const {
    filteredProjects,
    loading,
    error,
    sideFilter,
    setSideFilter,
    search,
    setSearch,
    selectedProjectId,
    setSelectedProjectId,
  } = useProject();

  const emptyMsg =
    sideFilter === 'mine'
      ? '내가 참여한 프로젝트가 없습니다.'
      : sideFilter === 'active'
      ? '진행 중인 프로젝트가 없습니다.'
      : '프로젝트가 없습니다.';

  return (
    <aside className="pm-sidebar">
      <div className="pm-side-tabs">
        {PROJECT_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`pm-tab ${sideFilter === f.id ? 'active' : ''}`}
            onClick={() => setSideFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="pm-search">
        <i className="fa-solid fa-magnifying-glass" />
        <input
          type="text"
          placeholder="프로젝트 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="pm-project-list">
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 10px',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            불러오는 중...
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 10px',
              color: 'var(--danger)',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 10px',
              color: 'var(--text-muted)',
              fontSize: '0.88rem',
            }}
          >
            <i
              className="fa-regular fa-folder-open"
              style={{
                fontSize: '1.8rem',
                opacity: 0.4,
                marginBottom: 10,
                display: 'block',
              }}
            />
            {emptyMsg}
          </div>
        )}

        {!loading &&
          !error &&
          filteredProjects.map((p) => {
            const pri = PRIORITY_META[p.priority] || {};
            return (
              <div
                key={p.id}
                className={`pm-project-item ${
                  selectedProjectId === p.id ? 'active' : ''
                }`}
                style={{ '--pm-color': p.color || '#4361ee' }}
                onClick={() => setSelectedProjectId(p.id)}
              >
                <h4 title={p.title}>{p.title}</h4>
                <div className="pm-pi-meta">
                  <span>
                    {pri.icon || ''} {pri.label || ''}
                  </span>
                  <span>{ddayText(p.end_date)}</span>
                </div>
                <div className="pm-pi-progress">
                  <span style={{ width: `${p.progress || 0}%` }} />
                </div>
              </div>
            );
          })}
      </div>
    </aside>
  );
}