// components/decisions/DecisionsHeader.jsx
// 검색 + 필터 칩.

import { useDecisions } from '../../contexts/DecisionsContext';
import { DECISION_TYPES } from '../../config/meetingCanvasConfig';

export default function DecisionsHeader() {
  const {
    search, setSearch,
    typeFilter, setTypeFilter,
    phaseFilter, setPhaseFilter,
    resolvedFilter, setResolvedFilter,
    convertedFilter, setConvertedFilter,
    stats, filtered,
  } = useDecisions();

  return (
    <div className="dt-header">
      <div className="dt-search-row">
        <div className="dt-search-box">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            placeholder="내용·회의명·담당자로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="dt-search-clear"
              onClick={() => setSearch('')}
              title="초기화"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
        <div className="dt-result-count">
          {filtered.length}건 / 전체 {stats.total}건
        </div>
      </div>

      <div className="dt-filter-row">
        <div className="dt-filter-group">
          <span className="dt-filter-label">타입</span>
          <button
            type="button"
            className={`dt-chip ${typeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            전체
          </button>
          {DECISION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`dt-chip ${typeFilter === t.value ? 'active' : ''}`}
              onClick={() => setTypeFilter(t.value)}
              style={typeFilter === t.value ? {
                color: t.color,
                borderColor: t.color,
                background: `${t.color}15`,
              } : {}}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        <div className="dt-filter-group">
          <span className="dt-filter-label">단계</span>
          {[
            { value: 'all', label: '전체' },
            { value: 'pre', label: '회의 전' },
            { value: 'live', label: '회의 중' },
            { value: 'post', label: '회의 후' },
            { value: 'archived', label: '보관' },
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              className={`dt-chip ${phaseFilter === p.value ? 'active' : ''}`}
              onClick={() => setPhaseFilter(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {(typeFilter === 'action' || typeFilter === 'all') && (
          <>
            <div className="dt-filter-group">
              <span className="dt-filter-label">액션 상태</span>
              {[
                { value: 'all', label: '전체' },
                { value: 'open', label: '미해결' },
                { value: 'resolved', label: '완료' },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`dt-chip ${resolvedFilter === r.value ? 'active' : ''}`}
                  onClick={() => setResolvedFilter(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="dt-filter-group">
              <span className="dt-filter-label">칸반 변환</span>
              {[
                { value: 'all', label: '전체' },
                { value: 'converted', label: '변환됨' },
                { value: 'not-converted', label: '미변환' },
              ].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`dt-chip ${convertedFilter === c.value ? 'active' : ''}`}
                  onClick={() => setConvertedFilter(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}