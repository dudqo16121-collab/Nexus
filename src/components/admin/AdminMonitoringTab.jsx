// components/admin/AdminMonitoringTab.jsx
// 시스템 모니터링 탭 — 데이터 활성도 + 근태 통계 + 서비스 상태 + 로그.

import { useEffect } from 'react';
import { useAdmin } from '../../contexts/AdminContext';

const widgetStyle = {
  boxShadow: 'none',
  border: '1px solid var(--border-color)',
  background: 'var(--panel-bg)',
  color: 'var(--text-main)',
};
const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  color: 'var(--text-main)',
};
const labelStyle = {
  color: 'var(--text-main)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};
const iconStyle = { color: 'var(--text-muted)' };

export default function AdminMonitoringTab() {
  const {
    monitoring,
    monitoringLoading,
    monitoringLogs,
    loadMonitoring,
    /* 근태 KPI 재활용 */
    attendanceKpi,
    attendanceLoading,
    loadAttendance,
    /* 근무 시간 통계 — 아래 새 헬퍼 */
    attendanceRows,
  } = useAdmin();

  /* 탭 진입 시 모니터링 + 근태 로드 */
  useEffect(() => {
    loadMonitoring();
    loadAttendance();
  }, [loadMonitoring, loadAttendance]);

  const fmt = (n, unit) => (monitoringLoading ? `- ${unit}` : `${n} ${unit}`);

  /* 평균 근무시간 계산 — 퇴근 완료자 대상 */
  const avgWorkHours = (() => {
    if (!attendanceRows || attendanceRows.length === 0) return '-';
    const closed = attendanceRows.filter(
      ({ record }) => record?.check_in && record?.check_out
    );
    if (closed.length === 0) return '-';
    const totalMs = closed.reduce(
      (sum, { record }) =>
        sum + (new Date(record.check_out) - new Date(record.check_in)),
      0
    );
    const avgMs = totalMs / closed.length;
    const h = Math.floor(avgMs / 3_600_000);
    const m = Math.round((avgMs % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  })();

  /* 지각자 수 */
  const lateCount = attendanceRows
    ? attendanceRows.filter(({ record }) => record?.status === '지각').length
    : 0;

  /* 현재 근무 중인 사람 수 */
  const workingNow = attendanceRows
    ? attendanceRows.filter(
        ({ record }) => record?.check_in && !record?.check_out
      ).length
    : 0;

  return (
    <div style={{ color: 'var(--text-main)' }}>
      {/* 1행: 근태 KPI 4개 카드 */}
      <h3
        style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <i
          className="fa-solid fa-user-clock"
          style={{ color: 'var(--primary-color)' }}
        />
        오늘의 근태 요약
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div className="widget" style={widgetStyle}>
          <h3>출근 / 전체</h3>
          <div
            className="count"
            style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}
          >
            {attendanceLoading
              ? '-'
              : `${attendanceKpi.attended} / ${attendanceKpi.total}`}
          </div>
        </div>
        <div className="widget" style={widgetStyle}>
          <h3>현재 근무 중</h3>
          <div
            className="count"
            style={{ fontSize: '1.4rem', color: 'var(--success)' }}
          >
            {attendanceLoading ? '-' : `${workingNow}`} 명
          </div>
        </div>
        <div className="widget" style={widgetStyle}>
          <h3>지각</h3>
          <div
            className="count"
            style={{ fontSize: '1.4rem', color: 'var(--warning)' }}
          >
            {attendanceLoading ? '-' : `${lateCount}`} 명
          </div>
        </div>
        <div className="widget" style={widgetStyle}>
          <h3>평균 근무시간</h3>
          <div
            className="count"
            style={{ fontSize: '1.4rem', color: 'var(--primary-color)' }}
          >
            {attendanceLoading ? '-' : avgWorkHours}
          </div>
        </div>
      </div>

      {/* 2행: 데이터 활성도 + 서비스 상태 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* 데이터 활성도 현황 */}
        <div className="widget" style={widgetStyle}>
          <h3 style={{ marginBottom: 12 }}>데이터 활성도 현황</h3>
          <div style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
            <div
              style={{
                ...rowStyle,
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <span style={labelStyle}>
                <i className="fa-solid fa-layer-group" style={iconStyle} />
                누적 게시글
              </span>
              <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>
                {fmt(monitoring.totalPosts, '건')}
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>
                <i className="fa-solid fa-folder-open" style={iconStyle} />
                자료실 파일
              </span>
              <span style={{ color: 'var(--warning)', fontWeight: 700 }}>
                {fmt(monitoring.totalFiles, '개')}
              </span>
            </div>
          </div>
        </div>

        {/* 서비스 연동 상태 */}
        <div className="widget" style={widgetStyle}>
          <h3 style={{ marginBottom: 12 }}>서비스 연동 상태</h3>
          <div style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
            <div
              style={{
                ...rowStyle,
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <span style={labelStyle}>
                <i className="fa-solid fa-database" style={iconStyle} />
                Supabase DB
              </span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                Connected
              </span>
            </div>
            <div
              style={{
                ...rowStyle,
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <span style={labelStyle}>
                <i className="fa-solid fa-shield-halved" style={iconStyle} />
                Auth Service
              </span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                Normal
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>
                <i className="fa-solid fa-users" style={iconStyle} />
                Active Sessions
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--text-main)',
                }}
              >
                {fmt(monitoring.activeSessions, '명')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 실시간 시스템 로그 */}
      <h3
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
          marginBottom: 10,
        }}
      >
        실시간 시스템 로그
      </h3>
      <div className="log-box" id="system-log-console">
        {monitoringLogs.length === 0 ? (
          <p>데이터 동기화 대기 중...</p>
        ) : (
          monitoringLogs.map((log, i) => (
            <p
              key={i}
              className={
                log.level === 'error'
                  ? 'log-error'
                  : log.level === 'warn'
                  ? 'log-warn'
                  : undefined
              }
            >
              [{log.level.toUpperCase()}] {log.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
}