// components/leave/AttendanceSummary.jsx
// 이번달 근태 요약 패널 — 출근일수 / 정상출근 / 지각 / 평균 근무시간
// 원본 index.html "이번달 근태 요약" 블록 + _renderAttendanceSummary 이관.

import { useLeave } from '../../contexts/LeaveContext';

const cellStyle = {
  padding: '15px',
  background: 'var(--bg-2)',
  borderRadius: '12px',
  textAlign: 'center',
};
const labelStyle = {
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
  marginBottom: '5px',
};
const valueStyle = {
  fontSize: '1.5rem',
  fontWeight: 800,
};

export default function AttendanceSummary() {
  const { attendance, loading } = useLeave();

  const dash = (n, unit) => (loading ? `- ${unit}` : `${n} ${unit}`);
  const avg =
    loading || attendance.avgHours <= 0
      ? '- 시간'
      : `${attendance.avgHours.toFixed(1)} 시간`;

  return (
    <div className="panel" style={{ marginBottom: '25px' }}>
      <h3
        style={{
          marginBottom: '15px',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <i className="fa-solid fa-clock" style={{ color: 'var(--primary-color)' }} />
        이번달 근태 요약{' '}
        <span
          style={{
            fontWeight: 400,
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
          }}
        >
          {attendance.monthLabel}
        </span>
      </h3>

      <div
        className="widget-grid"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}
      >
        <div style={cellStyle}>
          <div style={labelStyle}>출근일수</div>
          <div style={{ ...valueStyle, color: 'var(--primary-color)' }}>
            {dash(attendance.workDays, '일')}
          </div>
        </div>
        <div style={cellStyle}>
          <div style={labelStyle}>정상 출근</div>
          <div style={{ ...valueStyle, color: 'var(--success)' }}>
            {dash(attendance.normalDays, '일')}
          </div>
        </div>
        <div style={cellStyle}>
          <div style={labelStyle}>지각</div>
          <div style={{ ...valueStyle, color: 'var(--warning)' }}>
            {dash(attendance.lateDays, '일')}
          </div>
        </div>
        <div style={cellStyle}>
          <div style={labelStyle}>평균 근무시간</div>
          <div style={{ ...valueStyle, color: 'var(--text-main)' }}>{avg}</div>
        </div>
      </div>
    </div>
  );
}
