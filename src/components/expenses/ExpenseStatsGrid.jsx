// components/expenses/ExpenseStatsGrid.jsx
// 정산 통계 위젯 4개 — 이번달 사용액 / 정산 대기 / 결재 진행 중 / 정산 완료
// 원본 index.html "통계 위젯" 블록 + renderExpenseStats 이관.

import { useExpense } from '../../contexts/ExpenseContext';
import { fmtKRW } from '../../config/expenseTypes';

export default function ExpenseStatsGrid() {
  const { stats, loading } = useExpense();

  const cards = [
    {
      key: 'month',
      cls: 'es-month',
      icon: 'fa-won-sign',
      label: '이번 달 사용액',
      data: stats.month,
    },
    {
      key: 'pending',
      cls: 'es-pending',
      icon: 'fa-hourglass-half',
      label: '정산 대기',
      data: stats.pending,
    },
    {
      key: 'progress',
      cls: 'es-progress',
      icon: 'fa-spinner',
      label: '결재 진행 중',
      data: stats.progress,
    },
    {
      key: 'done',
      cls: 'es-done',
      icon: 'fa-circle-check',
      label: '정산 완료 (이번달)',
      data: stats.done,
    },
  ];

  return (
    <div className="expense-stats-grid">
      {cards.map((c) => (
        <div key={c.key} className={`expense-stat-card ${c.cls}`}>
          <div className="es-icon">
            <i className={`fa-solid ${c.icon}`} />
          </div>
          <div className="es-info">
            <p className="es-label">{c.label}</p>
            <h3 className="es-value">
              {loading ? '₩ 0' : fmtKRW(c.data.total)}
            </h3>
            <p className="es-sub">{loading ? '0건' : `${c.data.count}건`}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
