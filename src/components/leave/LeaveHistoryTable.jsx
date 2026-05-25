// components/leave/LeaveHistoryTable.jsx
// 휴가 신청 내역 테이블 — 원본 index.html "휴가 사용 내역" 블록 + _renderLeaveHistory 이관.
// 상세 보기는 결재 상세모달(ApprovalViewModal)을 재사용한다 (원본 openApprovalView 대응).
// 상세 모달 열림 상태는 LeaveContext 가 관리하고, 모달 렌더링은 Leave.jsx 에서 한다.

import { useLeave } from '../../contexts/LeaveContext';
import {
  leaveDaysFromFields,
  formatLeavePeriod,
  LEAVE_STATUS_MAP,
} from '../../config/leaveTypes';

export default function LeaveHistoryTable() {
  const { leaveDocs, loading, error, year, openLeaveDetail } = useLeave();

  const renderBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={6} style={emptyCellStyle}>
            불러오는 중...
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={6} style={{ ...emptyCellStyle, color: 'var(--danger)' }}>
            데이터 로드 실패: {error}
          </td>
        </tr>
      );
    }

    if (!leaveDocs.length) {
      return (
        <tr>
          <td colSpan={6} style={emptyCellStyle}>
            {year}년에 신청한 휴가 내역이 없습니다.
          </td>
        </tr>
      );
    }

    return leaveDocs.map((d) => {
      const f = d.fields || {};
      const days = leaveDaysFromFields(f);
      const period = formatLeavePeriod(f);
      const created = (d.created_at || '').slice(0, 10).replace(/-/g, '.');
      const st =
        LEAVE_STATUS_MAP[d.status] || {
          label: d.status || '-',
          cls: 'status-pending',
        };

      return (
        <tr key={d.id}>
          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            {created}
          </td>
          <td style={{ textAlign: 'center', fontWeight: 600 }}>
            {f.f_leave_type || '연차'}
          </td>
          <td>{period}</td>
          <td
            style={{
              textAlign: 'center',
              color: 'var(--danger)',
              fontWeight: 700,
            }}
          >
            - {days}
          </td>
          <td style={{ textAlign: 'center' }}>
            <span className={`status-badge ${st.cls}`}>{st.label}</span>
          </td>
          <td style={{ textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-icon"
              style={detailBtnStyle}
              onClick={() => openLeaveDetail(d.id)}
              title="결재 상세 보기"
            >
              <i className="fa-solid fa-eye" />
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="board-container">
      <div className="board-filter-bar">
        <h3 style={{ fontSize: '1.1rem' }}>
          휴가 신청 내역{' '}
          <span
            style={{
              fontWeight: 400,
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            ({year}년)
          </span>
        </h3>
      </div>
      <table className="board-table">
        <thead>
          <tr>
            <th style={{ width: '130px', textAlign: 'center' }}>신청일</th>
            <th style={{ width: '130px', textAlign: 'center' }}>구분</th>
            <th>사용 기간</th>
            <th style={{ width: '90px', textAlign: 'center' }}>차감일수</th>
            <th style={{ width: '110px', textAlign: 'center' }}>상태</th>
            <th style={{ width: '90px', textAlign: 'center' }}>상세</th>
          </tr>
        </thead>
        <tbody>{renderBody()}</tbody>
      </table>
    </div>
  );
}

const emptyCellStyle = {
  textAlign: 'center',
  padding: '40px',
  color: 'var(--text-muted)',
};

const detailBtnStyle = {
  padding: '6px 12px',
  fontSize: '0.85rem',
  background: 'var(--bg-2)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  cursor: 'pointer',
};