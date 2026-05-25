// components/expenses/ExpenseRecordsTable.jsx
// 지출 내역 테이블 — 원본 #expense-records-view + renderExpenseRecords 이관.
// pending 상태만 수정 가능 (원본 canEdit 로직).

import { useExpense } from '../../contexts/ExpenseContext';
import { catColor, fmtKRW, expenseStatusLabel } from '../../config/expenseTypes';

/* 카테고리 뱃지 — 원본 ex-cat-badge 인라인 스타일 그대로 */
function CatBadge({ category }) {
  const c = catColor(category);
  return (
    <span
      className="ex-cat-badge"
      style={{
        background: `${c}22`,
        color: c,
        borderColor: `${c}55`,
      }}
    >
      {category}
    </span>
  );
}

export default function ExpenseRecordsTable() {
  const { filteredRecords, loading, error, openRecordEdit } = useExpense();

  const colCount = 7;

  return (
    <div id="expense-records-view">
      <table className="board-table board-table-enhanced expense-table">
        <thead>
          <tr>
            <th style={{ width: 110 }}>사용일</th>
            <th style={{ width: 110 }}>카테고리</th>
            <th>가맹점 / 메모</th>
            <th style={{ width: 130, textAlign: 'right' }}>금액</th>
            <th style={{ width: 110 }}>결제수단</th>
            <th style={{ width: 110 }}>상태</th>
            <th style={{ width: 80 }}>관리</th>
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

          {!loading && !error && filteredRecords.length === 0 && (
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
                    className="fa-solid fa-receipt"
                    style={{
                      fontSize: '3.5rem',
                      marginBottom: 15,
                      opacity: 0.4,
                    }}
                  />
                  <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>
                    조건에 맞는 지출 내역이 없습니다.
                  </h3>
                  <p style={{ fontSize: '0.9rem' }}>
                    우측 상단의 [지출 등록] 버튼으로 사용 내역을 추가해보세요.
                  </p>
                </div>
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            filteredRecords.map((r) => {
              const canEdit = r.status === 'pending';
              return (
                <tr key={r.id}>
                  <td>{r.used_date || '-'}</td>
                  <td>
                    <CatBadge category={r.category} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.merchant}</div>
                    {r.memo && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          marginTop: 2,
                        }}
                      >
                        {r.memo}
                      </div>
                    )}
                  </td>
                  <td className="ex-amount">{fmtKRW(r.amount)}</td>
                  <td
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {r.payment_method || '-'}
                  </td>
                  <td>
                    <span className={`ex-status-badge ${r.status}`}>
                      {expenseStatusLabel(r.status)}
                    </span>
                  </td>
                  <td>
                    {canEdit ? (
                      <button
                        type="button"
                        className="ex-action-btn"
                        onClick={() => openRecordEdit(r.id)}
                        title="수정"
                      >
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ex-action-btn"
                        style={{ opacity: 0.4, cursor: 'not-allowed' }}
                        disabled
                        title="정산 신청된 내역은 수정할 수 없습니다."
                      >
                        <i className="fa-solid fa-lock" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

/* 다른 컴포넌트(정산 신청서 모달)에서도 쓰도록 CatBadge 재노출 */
export { CatBadge };
