import { useApproval, FORM_TYPES, URGENCY_LEVELS } from '../../contexts/ApprovalContext';

const TABS = [
  { key: 'all', label: '전체 문서함' },
  { key: 'pending_me', label: '결재 대기함' },
  { key: 'my_draft', label: '내 상신함' },
  { key: 'approved', label: '완료함' },
  { key: 'rejected', label: '반려함' },
];

const URGENCY_LABELS = {
  긴급: '🔴 긴급',
  보통: '🟡 보통',
  일반: '일반',
};

export default function ApprovalFilterBar() {
  const {
    tab,
    setTab,
    typeFilter,
    setTypeFilter,
    urgencyFilter,
    setUrgencyFilter,
    search,
    setSearch,
  } = useApproval();

  return (
    <div className="appr-filter-bar">
      <div className="board-tabs">
        {TABS.map((t) => (
          <div
            key={t.key}
            className={`board-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="appr-filter-controls">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="appr-filter-select"
        >
          <option value="">전체 양식</option>
          {FORM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="appr-filter-select"
        >
          <option value="">전체 긴급도</option>
          {URGENCY_LEVELS.map((u) => (
            <option key={u} value={u}>
              {URGENCY_LABELS[u]}
            </option>
          ))}
        </select>

        <div className="appr-search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="제목·문서번호 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}