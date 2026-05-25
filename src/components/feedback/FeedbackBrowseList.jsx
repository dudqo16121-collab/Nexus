// components/feedback/FeedbackBrowseList.jsx
// 필터바 + 정렬 + 카드 목록.

import { useFeedback } from '../../contexts/FeedbackContext';
import {
  FEEDBACK_CATEGORIES,
  SORT_OPTIONS,
  FILTER_STATUS_OPTIONS,
} from '../../config/feedbackTypes';
import FeedbackCard from './FeedbackCard';

export default function FeedbackBrowseList({ onlyMine = false }) {
  const {
    filteredFeedbacks,
    filter,
    setFilter,
    categoryCounts,
    loading,
    error,
  } = useFeedback();

  // onlyMine 이 props 로 강제된 경우 필터에도 반영
  const effectiveFilter = onlyMine ? { ...filter, onlyMine: true } : filter;

  const updateFilter = (patch) => {
    setFilter({ ...filter, ...patch });
  };

  return (
    <div className="fb-browse">
      {/* 필터바 */}
      <div className="fb-filter-bar">
        <div className="fb-filter-row">
          <input
            type="text"
            className="fb-search-input"
            placeholder="🔍 제목/본문 검색..."
            value={filter.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
          />
          <select
            className="fb-filter-select"
            value={filter.sort}
            onChange={(e) => updateFilter({ sort: e.target.value })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="fb-filter-select"
            value={filter.status}
            onChange={(e) => updateFilter({ status: e.target.value })}
          >
            {FILTER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* 카테고리 칩 */}
        <div className="fb-cat-chips">
          <button
            type="button"
            className={`fb-cat-chip ${filter.category === 'all' ? 'active' : ''}`}
            onClick={() => updateFilter({ category: 'all' })}
          >
            전체
            <span className="fb-chip-count">{categoryCounts.all || 0}</span>
          </button>
          {FEEDBACK_CATEGORIES.map((c) => {
            const isActive = filter.category === c.value;
            return (
              <button
                key={c.value}
                type="button"
                className={`fb-cat-chip ${isActive ? 'active' : ''}`}
                style={isActive ? { borderColor: c.color, color: c.color, background: `${c.color}15` } : {}}
                onClick={() => updateFilter({ category: c.value })}
              >
                {c.emoji} {c.label}
                <span className="fb-chip-count">{categoryCounts[c.value] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="fb-empty">
          <i className="fa-solid fa-spinner fa-spin" />
          <p>불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="fb-empty fb-empty-error">
          <i className="fa-solid fa-triangle-exclamation" />
          <p>데이터를 불러오지 못했어요: {error}</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="fb-empty">
          <i className="fa-solid fa-inbox" />
          <h3>{onlyMine ? '아직 작성한 피드백이 없어요' : '조건에 맞는 피드백이 없어요'}</h3>
          <p>{onlyMine ? '첫 번째 익명 피드백을 남겨보세요' : '다른 필터로 검색해보세요'}</p>
        </div>
      ) : (
        <div className="fb-card-list">
          {filteredFeedbacks.map((f) => (
            <FeedbackCard key={f.id} feedback={f} />
          ))}
        </div>
      )}
    </div>
  );
}