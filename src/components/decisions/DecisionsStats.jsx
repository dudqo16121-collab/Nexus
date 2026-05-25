// components/decisions/DecisionsStats.jsx
// 상단 통계 4개 카드.

import { useDecisions } from '../../contexts/DecisionsContext';

export default function DecisionsStats() {
  const { stats } = useDecisions();

  const cards = [
    { label: '결정사항', value: stats.decision, icon: 'fa-gavel', color: '#4361ee' },
    { label: '액션 (미완료)', value: stats.actionsOpen, icon: 'fa-bolt', color: '#06d6a0' },
    { label: '미해결 질문', value: stats.question, icon: 'fa-circle-question', color: '#ffd166' },
    { label: '칸반 변환됨', value: stats.actionsConverted, icon: 'fa-link', color: '#ec4899' },
  ];

  return (
    <div className="dt-stats">
      {cards.map((c) => (
        <div key={c.label} className="dt-stat-card" style={{ borderLeftColor: c.color }}>
          <div className="dt-stat-icon" style={{ color: c.color, background: `${c.color}15` }}>
            <i className={`fa-solid ${c.icon}`} />
          </div>
          <div className="dt-stat-body">
            <strong style={{ color: c.color }}>{c.value}</strong>
            <span>{c.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}