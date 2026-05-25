// components/expenses/ExpenseReportModal.jsx
// 정산 신청서 작성 모달 — 원본 #expense-report-modal + openExpenseReportModal /
// updateExpenseReportSelection / submitExpenseReport 이관.
// pending 지출을 체크박스로 선택 → 합계 자동 계산 → 정산 신청.

import { useEffect, useState, useMemo } from 'react';
import Modal from '../common/Modal';
import { useExpense } from '../../contexts/ExpenseContext';
import { fmtKRW } from '../../config/expenseTypes';
import { CatBadge } from './ExpenseRecordsTable';
import { useToast } from '../../contexts/ToastContext';

export default function ExpenseReportModal() {
  const toast = useToast();
  const {
    reportModalOpen,
    closeReportModal,
    pendingRecords,
    submitReport,
  } = useExpense();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);

  /* 모달 열릴 때 초기화 */
  useEffect(() => {
    if (reportModalOpen) {
      setTitle('');
      setNote('');
      setSelectedIds(new Set());
    }
  }, [reportModalOpen]);

  /* 선택 합계 */
  const { selectedCount, selectedTotal } = useMemo(() => {
    let total = 0;
    pendingRecords.forEach((r) => {
      if (selectedIds.has(r.id)) total += Number(r.amount || 0);
    });
    return { selectedCount: selectedIds.size, selectedTotal: total };
  }, [selectedIds, pendingRecords]);

  const allChecked =
    pendingRecords.length > 0 && selectedIds.size === pendingRecords.length;

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelectedIds(checked ? new Set(pendingRecords.map((r) => r.id)) : new Set());
  };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.warning('정산 제목을 입력해주세요.');
    if (selectedIds.size === 0)
      return toast.warning('정산할 지출을 1건 이상 선택해주세요.');

    setSubmitting(true);
    const result = await submitReport([...selectedIds], { title, note });
    setSubmitting(false);

    if (result.ok) {
      toast.success(`정산 신청이 완료되었습니다. (${result.docNumber})`);
      closeReportModal();
    } else {
      toast.error(`정산 신청 중 오류가 발생했습니다.\n${result.error || ''}`);
    }
  };

  return (
    <Modal
      isOpen={reportModalOpen}
      onClose={closeReportModal}
      size="lg"
      title={null}
    >
      <div style={{ padding: 4, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: '1.25rem' }}>
            <i
              className="fa-solid fa-paper-plane"
              style={{ color: 'var(--primary-color)', marginRight: 6 }}
            />
            법인카드 정산 신청서
          </h2>
        </div>

        {/* 제목 */}
        <div className="expense-form-field full" style={{ marginBottom: 14 }}>
          <label>정산 제목 *</label>
          <input
            type="text"
            placeholder="예: 11월 영업팀 거래처 미팅 정산"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <strong style={{ fontSize: '0.95rem' }}>
            <i
              className="fa-solid fa-list-check"
              style={{ color: 'var(--success)' }}
            />{' '}
            정산 대상 지출 내역
          </strong>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            아래 정산 대기 상태의 지출을 선택해주세요.
          </span>
        </div>

        {/* 선택 테이블 */}
        <div
          style={{
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            minHeight: 200,
            maxHeight: 320,
          }}
        >
          <table className="board-table expense-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th style={{ width: 100 }}>사용일</th>
                <th style={{ width: 90 }}>카테고리</th>
                <th>가맹점</th>
                <th style={{ width: 110, textAlign: 'right' }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {pendingRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: 'center',
                      padding: 40,
                      color: 'var(--text-muted)',
                    }}
                  >
                    정산 신청 가능한 지출 내역이 없습니다.
                  </td>
                </tr>
              )}
              {pendingRecords.map((r) => (
                <tr key={r.id}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                    />
                  </td>
                  <td>{r.used_date}</td>
                  <td>
                    <CatBadge category={r.category} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.merchant}</div>
                    {r.memo && (
                      <div
                        style={{
                          fontSize: '0.78rem',
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

        {/* 선택 합계 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 14,
            padding: '14px 18px',
            background: 'var(--bg-body)',
            borderRadius: 10,
          }}
        >
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            선택:{' '}
            <strong style={{ color: 'var(--primary-color)' }}>
              {selectedCount}
            </strong>
            건
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>
            합계:{' '}
            <span style={{ color: 'var(--success)' }}>
              {fmtKRW(selectedTotal)}
            </span>
          </span>
        </div>

        {/* 특이사항 */}
        <div className="expense-form-field full" style={{ marginTop: 14 }}>
          <label>특이사항</label>
          <textarea
            rows={2}
            placeholder="결재선/사유 등 추가 설명"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            marginTop: 18,
          }}
        >
          <button
            type="button"
            className="btn btn-out"
            onClick={closeReportModal}
            disabled={submitting}
            style={{ width: 90 }}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-in"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ width: 130 }}
          >
            <i className="fa-solid fa-paper-plane" />{' '}
            {submitting ? '처리 중...' : '신청하기'}
          </button>
        </div>
      </div>
    </Modal>
  );
}