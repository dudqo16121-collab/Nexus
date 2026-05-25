// components/expenses/ExpenseRecordModal.jsx
// 지출 등록/수정 모달 — 원본 #expense-record-modal + openExpenseRecordModal /
// saveExpenseRecord / deleteExpenseRecord 이관.
// 공통 Modal 래퍼 사용. recordModal.editingId 로 등록/수정 모드 구분.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useExpense } from '../../contexts/ExpenseContext';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../config/expenseTypes';
import { useToast } from '../../contexts/ToastContext';

const EMPTY = {
  used_date: '',
  category: '식비',
  merchant: '',
  amount: '',
  payment_method: '법인카드',
  memo: '',
};

const today = () => new Date().toISOString().split('T')[0];

export default function ExpenseRecordModal() {
  const toast = useToast();
  const {
    recordModal,
    closeRecordModal,
    records,
    saveRecord,
    deleteRecord,
  } = useExpense();

  const { open, editingId } = recordModal;
  const editing = records.find((r) => r.id === editingId) || null;

  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  /* 모달 열릴 때 폼 초기화 — 수정이면 기존 값, 등록이면 빈 값 + 오늘 날짜 */
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        used_date: editing.used_date || '',
        category: editing.category || '식비',
        merchant: editing.merchant || '',
        amount: editing.amount ?? '',
        payment_method: editing.payment_method || '법인카드',
        memo: editing.memo || '',
      });
    } else {
      setForm({ ...EMPTY, used_date: today() });
    }
  }, [open, editingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.used_date) return toast.warning('사용일을 선택해주세요.');
    if (!form.merchant.trim()) return toast.warning('가맹점을 입력해주세요.');
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.warning('올바른 금액을 입력해주세요.');

    setSubmitting(true);
    const result = await saveRecord(form, editingId);
    setSubmitting(false);

    if (result.ok) {
      toast.success(result.editing ? '지출 내역이 수정되었습니다.' : '지출이 등록되었습니다.');
      closeRecordModal();
    } else {
      toast.error(`저장 중 오류가 발생했습니다.\n${result.error || ''}`);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!window.confirm('정말로 이 지출 내역을 삭제하시겠습니까?')) return;

    setSubmitting(true);
    const result = await deleteRecord(editingId);
    setSubmitting(false);

    if (result.ok) {
      toast.success('지출 내역이 삭제되었습니다.');
      closeRecordModal();
    } else {
      toast.error(`삭제 중 오류가 발생했습니다.\n${result.error || ''}`);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeRecordModal} size="md" title={null}>
      <div style={{ padding: 4 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: '1.25rem' }}>
            <i
              className="fa-solid fa-receipt"
              style={{ color: 'var(--success)', marginRight: 6 }}
            />
            {editing ? '지출 내역 수정' : '지출 등록'}
          </h2>
        </div>

        <div className="expense-form-grid">
          <div className="expense-form-field">
            <label>사용일 *</label>
            <input
              type="date"
              value={form.used_date}
              onChange={(e) => patch('used_date', e.target.value)}
            />
          </div>

          <div className="expense-form-field">
            <label>카테고리 *</label>
            <select
              value={form.category}
              onChange={(e) => patch('category', e.target.value)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.value}
                </option>
              ))}
            </select>
          </div>

          <div className="expense-form-field full">
            <label>가맹점 *</label>
            <input
              type="text"
              placeholder="예: 스타벅스 강남점"
              value={form.merchant}
              onChange={(e) => patch('merchant', e.target.value)}
            />
          </div>

          <div className="expense-form-field">
            <label>금액 (원) *</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              step="100"
              value={form.amount}
              onChange={(e) => patch('amount', e.target.value)}
            />
          </div>

          <div className="expense-form-field">
            <label>결제수단</label>
            <select
              value={form.payment_method}
              onChange={(e) => patch('payment_method', e.target.value)}
            >
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="expense-form-field full">
            <label>메모 / 사용 목적</label>
            <textarea
              rows={2}
              placeholder="예: 거래처 OO 미팅 후 식사"
              value={form.memo}
              onChange={(e) => patch('memo', e.target.value)}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            marginTop: 22,
          }}
        >
          <button
            type="button"
            className="btn btn-out"
            onClick={closeRecordModal}
            disabled={submitting}
            style={{ width: 90 }}
          >
            취소
          </button>
          {editing && (
            <button
              type="button"
              className="btn"
              onClick={handleDelete}
              disabled={submitting}
              style={{
                width: 90,
                background: 'rgba(247,37,133,0.1)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
              }}
            >
              삭제
            </button>
          )}
          <button
            type="button"
            className="btn btn-in"
            onClick={handleSave}
            disabled={submitting}
            style={{ width: 110 }}
          >
            {submitting ? '처리 중...' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
  );
}