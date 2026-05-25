// components/leave/LeaveHeader.jsx
// 근태/연차 관리 페이지 헤더 — 연도 필터 + "휴가 신청" 버튼.
// 원본 index.html view-leave <header> + _initLeaveYearFilter + openLeaveModal 이관.
//
// "휴가 신청"은 결재 기안작성모달(ApprovalWriteModal)을 재사용한다.
// 모달 열림 상태는 LeaveContext 가 관리하고(openLeaveWrite), 실제 모달 렌더링은
// Leave.jsx 에서 한다. initialType='연차신청서' 는 Leave.jsx 쪽에서 주입한다.

import { useLeave } from '../../contexts/LeaveContext';
import { getLeaveYearOptions } from '../../config/leaveTypes';

export default function LeaveHeader() {
  const { year, setYear, openLeaveWrite } = useLeave();
  const years = getLeaveYearOptions();

  return (
    <header
      style={{
        background: 'transparent',
        backdropFilter: 'none',
        position: 'relative',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
          <i
            className="fa-solid fa-calendar-check"
            style={{ color: 'var(--primary-color)', marginRight: '10px' }}
          />
          근태/연차 관리
        </h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          내 근태 기록과 연차 현황을 확인하고 휴가를 신청하세요.
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          style={{
            padding: '10px 15px',
            borderRadius: '30px',
            border: '1px solid var(--border-color)',
            background: 'var(--panel-bg)',
            color: 'var(--text-main)',
            outline: 'none',
            fontFamily: 'inherit',
            boxShadow: 'var(--card-shadow)',
            cursor: 'pointer',
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-in"
          style={{ width: '130px', height: '42px' }}
          onClick={openLeaveWrite}
        >
          <i className="fa-solid fa-paper-plane" /> 휴가 신청
        </button>
      </div>
    </header>
  );
}