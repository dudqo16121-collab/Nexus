// components/leave/LeaveSummaryWidgets.jsx
// 연차 요약 위젯 4개 — 총 발생 / 사용 / 승인 대기 / 잔여
// 원본 index.html "연차 요약 위젯" 블록 + _renderLeaveSummary 이관.

import { useLeave } from '../../contexts/LeaveContext';

export default function LeaveSummaryWidgets() {
  const { summary, loading } = useLeave();

  // 로딩 중에는 원본처럼 '-' 표기
  const fmt = (n) => (loading ? '-' : n);

  const items = [
    {
      key: 'total',
      label: '총 발생 연차',
      value: fmt(summary.total),
      color: 'var(--primary-color)',
      bordered: true,
    },
    {
      key: 'used',
      label: '사용 연차',
      value: fmt(summary.used),
      color: 'var(--warning)',
    },
    {
      key: 'pending',
      label: '승인 대기',
      value: fmt(summary.pending),
      color: 'var(--text-muted)',
    },
    {
      key: 'remaining',
      label: '잔여 연차',
      value: fmt(summary.remaining),
      color: 'var(--success)',
    },
  ];

  return (
    <div className="widget-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {items.map((it) => (
        <div
          key={it.key}
          className="widget"
          style={it.bordered ? { border: '1px solid var(--primary-color)' } : undefined}
        >
          <h3>{it.label}</h3>
          <div className="count" style={{ color: it.color }}>
            {it.value} 일
          </div>
        </div>
      ))}
    </div>
  );
}
