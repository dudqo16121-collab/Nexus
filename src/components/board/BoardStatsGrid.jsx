import { useBoard } from '../../contexts/BoardContext';

const STAT_CARDS = [
  {
    key: 'total',
    label: '전체 게시글',
    icon: 'fa-solid fa-layer-group',
    className: 'stat-total',
  },
  {
    key: 'today',
    label: '오늘 작성',
    icon: 'fa-solid fa-calendar-day',
    className: 'stat-today',
  },
  {
    key: 'hot',
    label: '인기글 (HOT)',
    icon: 'fa-solid fa-fire',
    className: 'stat-hot',
  },
  {
    key: 'mine',
    label: '내가 쓴 글',
    icon: 'fa-solid fa-user-pen',
    className: 'stat-mine',
  },
];

export default function BoardStatsGrid() {
  const { boardStats } = useBoard();

  return (
    <div className="board-stats-grid">
      {STAT_CARDS.map((card) => (
        <div key={card.key} className={`board-stat-card ${card.className}`}>
          <div className="stat-icon">
            <i className={card.icon}></i>
          </div>
          <div className="stat-info">
            <p className="stat-label">{card.label}</p>
            <h3 className="stat-value">{boardStats[card.key] || 0}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}