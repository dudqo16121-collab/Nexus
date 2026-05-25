// components/expenses/ExpenseHeader.jsx
// 법인카드 정산 페이지 헤더 — 원본 view-expenses <header> 이관.
// "정산 신청" / "지출 등록" 버튼 → ExpenseContext 모달 상태 토글.
// 정산 신청은 정산 대기 지출이 0건이면 막는다 (원본 openExpenseReportModal 가드).

import { useExpense } from '../../contexts/ExpenseContext';
import { useToast } from '../../contexts/ToastContext';

export default function ExpenseHeader() {
  const toast = useToast();
  const { openRecordCreate, openReportModal, pendingRecords } = useExpense();

  const handleOpenReport = () => {
    if (pendingRecords.length === 0) {
      toast.warning('정산 신청 가능한 지출 내역이 없습니다.');
      return;
    }
    openReportModal();
  };

  return (
    <header
      style={{
        background: 'transparent',
        backdropFilter: 'none',
        position: 'relative',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
          <i
            className="fa-solid fa-credit-card"
            style={{ color: 'var(--success)', marginRight: 8 }}
          />
          법인카드 정산
        </h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          경비 지출 내역을 확인하고 정산을 신청하세요.
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'nowrap',
        }}
      >
        <button
          type="button"
          className="btn btn-out"
          style={{ width: 'auto', padding: '0 18px', height: 42 }}
          onClick={handleOpenReport}
        >
          <i className="fa-solid fa-paper-plane" /> 정산 신청
        </button>
        <button
          type="button"
          className="btn btn-in"
          style={{ width: 'auto', padding: '0 18px', height: 42 }}
          onClick={openRecordCreate}
        >
          <i className="fa-solid fa-plus" /> 지출 등록
        </button>
      </div>
    </header>
  );
}