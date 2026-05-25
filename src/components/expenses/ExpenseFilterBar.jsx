// components/expenses/ExpenseFilterBar.jsx
// 지출/정산 내역 패널의 탭 + 필터 바 — 원본 expense-filter-bar 블록 +
// switchExpenseTab 이관.

import { useExpense } from '../../contexts/ExpenseContext';
import {
  EXPENSE_CATEGORIES,
  RECORD_STATUS_OPTIONS,
  REPORT_STATUS_OPTIONS,
} from '../../config/expenseTypes';

export default function ExpenseFilterBar() {
  const {
    tab,
    setTab,
    recordFilters,
    setRecordFilters,
    reportStatusFilter,
    setReportStatusFilter,
    filteredRecords,
    filteredReports,
  } = useExpense();

  /* 지출 내역 필터 변경 헬퍼 */
  const patchRecordFilter = (patch) =>
    setRecordFilters((prev) => ({ ...prev, ...patch }));

  return (
    <div className="expense-filter-bar">
      {/* 탭 */}
      <div className="expense-tabs">
        <div
          className={`expense-tab ${tab === 'records' ? 'active' : ''}`}
          onClick={() => setTab('records')}
        >
          <i className="fa-solid fa-list" /> 지출 내역
          <span className="tab-count">{filteredRecords.length}</span>
        </div>
        <div
          className={`expense-tab ${tab === 'reports' ? 'active' : ''}`}
          onClick={() => setTab('reports')}
        >
          <i className="fa-solid fa-file-lines" /> 정산 신청 내역
          <span className="tab-count">{filteredReports.length}</span>
        </div>
      </div>

      {/* 지출 내역 필터 */}
      {tab === 'records' && (
        <div className="expense-filters">
          <select
            value={recordFilters.category}
            onChange={(e) => patchRecordFilter({ category: e.target.value })}
          >
            <option value="all">전체 카테고리</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value}
              </option>
            ))}
          </select>

          <select
            value={recordFilters.status}
            onChange={(e) => patchRecordFilter({ status: e.target.value })}
          >
            {RECORD_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={recordFilters.month}
            onChange={(e) => patchRecordFilter({ month: e.target.value })}
          />

          <div
            className="search-box"
            style={{
              width: 200,
              boxShadow: 'none',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
            }}
          >
            <i
              className="fa-solid fa-magnifying-glass"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="가맹점/메모 검색..."
              value={recordFilters.keyword}
              onChange={(e) => patchRecordFilter({ keyword: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* 정산 신청 내역 필터 */}
      {tab === 'reports' && (
        <div className="expense-filters">
          <select
            value={reportStatusFilter}
            onChange={(e) => setReportStatusFilter(e.target.value)}
          >
            {REPORT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
