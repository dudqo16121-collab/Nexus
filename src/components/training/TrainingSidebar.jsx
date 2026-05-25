// 카테고리 필터 사이드바.

import { useTraining, CATEGORIES } from '../../contexts/TrainingContext';

export default function TrainingSidebar() {
  const { categoryFilter, setCategoryFilter, courses } = useTraining();

  /* 카테고리별 카운트 */
  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c.id] = courses.filter((x) => x.category === c.id).length;
    return acc;
  }, {});

  return (
    <aside className="training-sidebar">
      <h4 className="training-sidebar-title">카테고리</h4>
      <div className="training-cat-list">
        <button
          type="button"
          className={`training-cat-item ${categoryFilter === null ? 'active' : ''}`}
          onClick={() => setCategoryFilter(null)}
        >
          <span><i className="fa-solid fa-layer-group" /> 전체</span>
          <span className="training-cat-count">{courses.length}</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`training-cat-item ${categoryFilter === c.id ? 'active' : ''}`}
            onClick={() => setCategoryFilter(c.id)}
          >
            <span>
              <i className={`fa-solid ${c.icon}`} style={{ color: c.color, marginRight: 8 }} />
              {c.label}
            </span>
            <span className="training-cat-count">{counts[c.id] || 0}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}