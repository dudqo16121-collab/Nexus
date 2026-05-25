// 이달의 랭킹 — 칭찬 받은 횟수 TOP 10.

import { useHub } from '../../contexts/HubContext';
import { useOrgChart } from '../../contexts/OrgChartContext';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function HubRanking() {
  const { monthlyRanking, userPoints, openSendKudos } = useHub();
  const { members } = useOrgChart() || { members: [] };
  const findUser = (id) => members.find((u) => u.id === id);

  return (
    <section className="hub-card">
      <header className="hub-card-header">
        <h3>
          <i className="fa-solid fa-ranking-star" style={{ color: '#f59e0b' }} />
          이달의 랭킹
        </h3>
        <span className="hub-card-sub">받은 칭찬 기준</span>
      </header>

      <div className="hub-ranking">
        {monthlyRanking.length === 0 ? (
          <div className="hub-empty">
            <i className="fa-solid fa-trophy" />
            <p>이번 달 첫 주인공이 되어보세요!</p>
          </div>
        ) : (
          monthlyRanking.map((row, idx) => {
            const u = findUser(row.userId);
            const stats = userPoints[row.userId];
            return (
              <div key={row.userId} className={`hub-rank-row rank-${idx + 1}`}>
                <div className="hub-rank-medal">
                  {idx < 3 ? MEDALS[idx] : <span className="hub-rank-num">{idx + 1}</span>}
                </div>
                <div
                  className="hub-rank-avatar"
                  style={{ backgroundImage: `url('${avatarUrl(u)}')` }}
                />
                <div className="hub-rank-info">
                  <strong>{u?.full_name || '알 수 없음'}</strong>
                  <span>{u?.department || '-'} · Lv. {stats?.level || 1}</span>
                </div>
                <div className="hub-rank-count">
                  <strong>{row.count}</strong>
                  <span>회</span>
                </div>
                <button
                  type="button"
                  className="hub-rank-cheer"
                  onClick={() => openSendKudos(row.userId)}
                  title="칭찬 보내기"
                >
                  <i className="fa-regular fa-heart" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}