// components/expenses/ExpenseRecentReports.jsx
// 최근 정산 신청 카드 리스트 (상단 우측 패널) — 원본 renderExpenseRecentReports 이관.

import { useExpense } from '../../contexts/ExpenseContext';
import { fmtKRW, expenseStatusLabel } from '../../config/expenseTypes';

export default function ExpenseRecentReports() {
  const { reports, loading, openReportView } = useExpense();

  if (loading) {
    return (
      <p
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          padding: '40px 0',
        }}
      >
        로딩 중...
      </p>
    );
  }

  const list = reports.slice(0, 5);

  if (list.length === 0) {
    return (
      <p
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          padding: '40px 0',
          fontSize: '0.9rem',
        }}
      >
        <i
          className="fa-regular fa-folder-open"
          style={{
            fontSize: '2rem',
            marginBottom: 10,
            opacity: 0.4,
            display: 'block',
          }}
        />
        정산 신청 내역이 없습니다.
      </p>
    );
  }

  return (
    <>
      {list.map((r) => (
        <div
          key={r.id}
          className="expense-report-card"
          onClick={() => openReportView(r.id)}
        >
          <div
            className={`erc-status ${r.status}`}
            title={expenseStatusLabel(r.status)}
          />
          <div className="erc-info">
            <div className="erc-title">{r.title}</div>
            <div className="erc-meta">
              <span style={{ fontFamily: 'monospace' }}>
                {r.doc_number || '-'}
              </span>{' '}
              · {r.record_count || 0}건 · {expenseStatusLabel(r.status)}
            </div>
          </div>
          <div className="erc-amount">{fmtKRW(r.total_amount)}</div>
        </div>
      ))}
    </>
  );
}
