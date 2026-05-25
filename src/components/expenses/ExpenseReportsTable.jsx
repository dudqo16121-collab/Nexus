// components/expenses/ExpenseReportsTable.jsx
// 정산 신청 내역 테이블 — 원본 #expense-reports-view + renderExpenseReports 이관.
// 행 클릭 시 정산 상세 모달 오픈.

import { useExpense } from '../../contexts/ExpenseContext';
import { fmtKRW, expenseStatusLabel } from '../../config/expenseTypes';

export default function ExpenseReportsTable() {
  const { filteredReports, loading, error, openReportView } = useExpense();

  const colCount = 7;

  return (
    <div id="expense-reports-view">
      <table className="board-table board-table-enhanced expense-table">
        <thead>
          <tr>
            <th style={{ width: 130 }}>신청번호</th>
            <th>제목</th>
            <th style={{ width: 100 }}>신청자</th>
            <th style={{ width: 130, textAlign: 'right' }}>총 금액</th>
            <th style={{ width: 80, textAlign: 'center' }}>건수</th>
            <th style={{ width: 120 }}>신청일</th>
            <th style={{ width: 110 }}>상태</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td
                colSpan={colCount}
                style={{
                  textAlign: 'center',
                  padding: 60,
                  color: 'var(--text-muted)',
                }}
              >
                불러오는 중...
              </td>
            </tr>
          )}

          {!loading && error && (
            <tr>
              <td
                colSpan={colCount}
                style={{
                  textAlign: 'center',
                  padding: 60,
                  color: 'var(--danger)',
                }}
              >
                데이터 로드 실패: {error}
              </td>
            </tr>
          )}

          {!loading && !error && filteredReports.length === 0 && (
            <tr>
              <td colSpan={colCount} style={{ padding: 0 }}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <i
                    className="fa-solid fa-file-circle-question"
                    style={{
                      fontSize: '3.5rem',
                      marginBottom: 15,
                      opacity: 0.4,
                    }}
                  />
                  <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>
                    정산 신청 내역이 없습니다.
                  </h3>
                  <p style={{ fontSize: '0.9rem' }}>
                    [정산 신청] 버튼으로 지출 내역을 묶어 신청해보세요.
                  </p>
                </div>
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            filteredReports.map((r) => (
              <tr
                key={r.id}
                style={{ cursor: 'pointer' }}
                onClick={() => openReportView(r.id)}
              >
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {r.doc_number || '-'}
                </td>
                <td style={{ fontWeight: 600 }}>{r.title}</td>
                <td>{r.user_name || '-'}</td>
                <td className="ex-amount">{fmtKRW(r.total_amount)}</td>
                <td style={{ textAlign: 'center' }}>{r.record_count || 0}</td>
                <td
                  style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}
                >
                  {(r.submitted_at || r.created_at || '').split('T')[0] || '-'}
                </td>
                <td>
                  <span className={`ex-status-badge ${r.status}`}>
                    {expenseStatusLabel(r.status)}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
