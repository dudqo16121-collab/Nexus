// 결재함 필터 바 (2단계 + 4단계 통합)
// 탭 칩 + 양식/긴급도 필터 + 검색 + 빠른 결재 모드 진입

import { useApproval, FORM_TYPES, URGENCY_LEVELS } from '../../contexts/ApprovalContext';

const URGENCY_LABELS = {
  긴급: '🔴 긴급',
  보통: '🟡 보통',
  일반: '일반',
};

export default function ApprovalFilterBar() {
  const {
    tab, setTab,
    typeFilter, setTypeFilter,
    urgencyFilter, setUrgencyFilter,
    search, setSearch,
    approvals,
    kpi,
    isMyTurn,
    /* 4단계 빠른 모드 */
    startPowerMode,
    myPendingDocIds,
  } = useApproval();

  /* 탭별 카운트 */
  const counts = {
    all: approvals.length,
    pending_me: kpi.pendingMe,
    my_draft: (kpi.myDraft || 0) + (kpi.drafts || 0),
    approved: approvals.filter((d) => d.status === 'approved').length,
    rejected: approvals.filter((d) => d.status === 'rejected').length,
  };

  const TABS = [
    { key: 'all',        label: '전체 문서함',  icon: 'fa-folder-open' },
    { key: 'pending_me', label: '결재 대기함', icon: 'fa-inbox', urgent: true },
    { key: 'my_draft',   label: '내 상신함',    icon: 'fa-paper-plane' },
    { key: 'approved',   label: '완료함',       icon: 'fa-circle-check' },
    { key: 'rejected',   label: '반려함',       icon: 'fa-circle-xmark' },
  ];

  /* ⭐ 빠른 모드 버튼 노출 조건 — 결재 대기 탭 + 대기 문서 1건 이상 */
  const showPowerModeBtn = tab === 'pending_me' && (myPendingDocIds?.length || 0) > 0;

  return (
    <div className="appr-filter-bar-v2">
      {/* 탭 칩 */}
      <div className="appr-tab-chips">
        {TABS.map((t) => {
          const cnt = counts[t.key] || 0;
          const isActive = tab === t.key;
          const showUrgent = t.urgent && cnt > 0;
          return (
            <button
              key={t.key}
              type="button"
              className={`appr-tab-chip ${isActive ? 'active' : ''} ${showUrgent ? 'has-urgent' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <i className={`fa-solid ${t.icon}`} />
              <span>{t.label}</span>
              {cnt > 0 && (
                <span className={`appr-tab-chip-count ${showUrgent ? 'urgent' : ''}`}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 필터 + 검색 + 빠른 모드 */}
      <div className="appr-filter-controls-v2">
        {showPowerModeBtn && (
          <button
            type="button"
            className="appr-power-mode-btn"
            onClick={startPowerMode}
            title="빠른 결재 모드 — 키보드로 빠르게 처리"
          >
            <i className="fa-solid fa-bolt" />
            빠른 결재 모드
            <span className="appr-power-mode-count">{myPendingDocIds.length}</span>
          </button>
        )}

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="appr-filter-select"
        >
          <option value="">전체 양식</option>
          {FORM_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="appr-filter-select"
        >
          <option value="">전체 긴급도</option>
          {URGENCY_LEVELS.map((u) => (
            <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
          ))}
        </select>

        {(typeFilter || urgencyFilter) && (
          <button
            type="button"
            className="appr-filter-clear"
            onClick={() => {
              setTypeFilter('');
              setUrgencyFilter('');
            }}
            title="필터 초기화"
          >
            <i className="fa-solid fa-xmark" />
            필터 해제
          </button>
        )}

        <div className="appr-search-box">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="제목·문서번호 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="appr-search-clear"
              onClick={() => setSearch('')}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}