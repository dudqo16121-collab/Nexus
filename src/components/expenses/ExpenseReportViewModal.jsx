// components/expenses/ExpenseReportViewModal.jsx
// 정산 신청 상세 모달 — 원본 #expense-report-view-modal + openExpenseReportView /
// cancelExpenseReport 이관.
// 본인 작성 + pending/draft 상태일 때만 신청 취소 가능.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useExpense } from '../../contexts/ExpenseContext';
import { useAuth } from '../../contexts/AuthContext';
import { catColor, fmtKRW, expenseStatusLabel } from '../../config/expenseTypes';
import { CatBadge } from './ExpenseRecordsTable';
import { useToast } from '../../contexts/ToastContext';

export default function ExpenseReportViewModal() {
  const toast = useToast();
  const {
    viewReportId,
    closeReportView,
    reports,
    getReportRecords,
    cancelReport,
  } = useExpense();
  const { user } = useAuth();

  const report = reports.find((r) => r.id === viewReportId) || null;

  const [includedRecords, setIncludedRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* 모달 열릴 때 포함 지출 내역 로드 */
  useEffect(() => {
    let cancelled = false;
    if (viewReportId) {
      setLoadingRecords(true);
      setIncludedRecords([]);
      getReportRecords(viewReportId).then((recs) => {
        if (!cancelled) {
          setIncludedRecords(recs);
          setLoadingRecords(false);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [viewReportId, getReportRecords]);

  if (!report) {
    // viewReportId 가 null 이거나 캐시에 없으면 모달 자체를 닫힌 상태로
    return (
      <Modal isOpen={false} onClose={closeReportView} size="lg" title={null}>
        <span />
      </Modal>
    );
  }

  /* 취소 가능 여부 — 원본 isOwner && status in (pending, draft) */
  const isOwner = !user || report.user_id === user.id;
  const canCancel = isOwner && ['pending', 'draft'].includes(report.status);

  const handleCancel = async () => {
    if (
      !window.confirm(
        '정산 신청을 취소하시겠습니까?\n포함된 지출 내역은 다시 [정산 대기] 상태로 돌아갑니다.'
      )
    )
      return;

    setSubmitting(true);
    const result = await cancelReport(report.id);
    setSubmitting(false);

    if (result.ok) {
      toast.success('정산 신청이 취소되었습니다.');
      closeReportView();
    } else {
      toast.error(`취소 처리 중 오류가 발생했습니다.\n${result.error || ''}`);
    }
  };

  const submittedDate =
    (report.submitted_at || report.created_at || '').split('T')[0] || '-';

  const metaItems = [
    { lbl: '신청번호', val: report.doc_number || '-', mono: true },
    { lbl: '신청자', val: report.user_name || '-' },
    { lbl: '부서', val: report.user_dept || '-' },
    { lbl: '신청일', val: submittedDate },
    {
      lbl: '총 금액',
      val: fmtKRW(report.total_amount),
      color: 'var(--success)',
    },
    { lbl: '건수', val: `${report.record_count || 0}건` },
  ];

  return (
    <Modal
      isOpen={viewReportId != null}
      onClose={closeReportView}
      size="lg"
      title={null}
    >
      <div style={{ padding: 4 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h2 style={{ fontSize: '1.25rem' }}>
            <i
              className="fa-solid fa-file-invoice-dollar"
              style={{ color: 'var(--warning)', marginRight: 6 }}
            />
            정산 신청 상세
          </h2>
        </div>

        {/* 제목 + 상태 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <h3 style={{ fontSize: '1.15rem', flex: 1 }}>{report.title}</h3>
          <span className={`ex-status-badge ${report.status}`}>
            {expenseStatusLabel(report.status)}
          </span>
        </div>

        {/* 메타 정보 */}
        <div className="expense-report-detail-meta">
          {metaItems.map((m) => (
            <div className="rdm-item" key={m.lbl}>
              <span className="lbl">{m.lbl}</span>
              <span
                className="val"
                style={{
                  ...(m.mono ? { fontFamily: 'monospace' } : null),
                  ...(m.color ? { color: m.color } : null),
                }}
              >
                {m.val}
              </span>
            </div>
          ))}
        </div>

        {/* 특이사항 */}
        {report.note && (
          <div
            style={{
              background: 'var(--bg-body)',
              padding: '14px 18px',
              borderRadius: 10,
              margin: '18px 0',
              fontSize: '0.9rem',
              lineHeight: 1.6,
            }}
          >
            <strong
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                display: 'block',
                marginBottom: 6,
              }}
            >
              📝 특이사항
            </strong>
            {report.note}
          </div>
        )}

        {/* 포함 지출 내역 */}
        <h4 style={{ fontSize: '0.95rem', margin: '18px 0 10px' }}>
          <i className="fa-solid fa-list-ul" /> 포함 지출 내역 (
          {includedRecords.length}건)
        </h4>
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <table className="board-table expense-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 100 }}>사용일</th>
                <th style={{ width: 90 }}>카테고리</th>
                <th>가맹점 / 메모</th>
                <th style={{ width: 110, textAlign: 'right' }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {loadingRecords && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: 'center',
                      padding: 20,
                      color: 'var(--text-muted)',
                    }}
                  >
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!loadingRecords && includedRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: 'center',
                      padding: 20,
                      color: 'var(--text-muted)',
                    }}
                  >
                    포함된 지출 내역이 없습니다.
                  </td>
                </tr>
              )}
              {!loadingRecords &&
                includedRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.used_date}</td>
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
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 액션 버튼 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 20,
          }}
        >
          {canCancel && (
            <button
              type="button"
              className="btn"
              onClick={handleCancel}
              disabled={submitting}
              style={{
                width: 110,
                background: 'rgba(247,37,133,0.1)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
              }}
            >
              {submitting ? '처리 중...' : '신청 취소'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-out"
            onClick={closeReportView}
            disabled={submitting}
            style={{ width: 90 }}
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
}