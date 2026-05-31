// components/hub/HubKudosWall.jsx
// 이번 주 베스트 칭찬 TOP 10 — 반응 많은 순.

import { useHub, KUDOS_TAGS } from '../../contexts/HubContext';
import HubKudosReactions from './HubKudosReactions';

function avatarUrl(uid) {
  return `https://i.pravatar.cc/150?u=${uid || 'x'}`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default function HubKudosWall() {
  const { weeklyTopKudos } = useHub();

  return (
    <section className="hub-card hub-kudos-wall-card">
      <header className="hub-card-header">
        <h3>
          <i className="fa-solid fa-fire" style={{ color: '#ef4444' }} />
          이번 주 베스트 칭찬
        </h3>
        <span className="hub-kudos-wall-subtitle">
          <i className="fa-solid fa-heart" style={{ color: '#f72585' }} />
          반응 많은 순 TOP 10
        </span>
      </header>

      {weeklyTopKudos.length === 0 ? (
        <div className="hub-kudos-wall-empty">
          <i className="fa-regular fa-heart" />
          <p>이번 주 아직 칭찬이 없어요</p>
          <span>동료에게 첫 칭찬을 보내보세요!</span>
        </div>
      ) : (
        <div className="hub-kudos-wall-grid">
          {weeklyTopKudos.map((k, idx) => {
            const tag = KUDOS_TAGS.find((t) => t.id === k.tag);
            const isTop3 = idx < 3;
            return (
              <div
                key={k.id}
                className={`hub-kudos-wall-card-item ${isTop3 ? 'top3' : ''}`}
              >
                {/* 순위 */}
                <div className={`hub-kudos-wall-rank rank-${idx + 1}`}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>

                {/* 칭찬 내용 */}
                <div className="hub-kudos-wall-content">
                  {/* 발신자 → 수신자 */}
                  <div className="hub-kudos-wall-people">
                    <div
                      className="hub-kudos-wall-avatar"
                      style={{ backgroundImage: `url('${avatarUrl(k.from_id)}')` }}
                    />
                    <i className="fa-solid fa-arrow-right hub-kudos-wall-arrow" />
                    <div
                      className="hub-kudos-wall-avatar"
                      style={{ backgroundImage: `url('${avatarUrl(k.to_id)}')` }}
                    />
                    {tag && (
                      <span
                        className="hub-kudos-wall-tag"
                        style={{
                          background: `${tag.color}15`,
                          color: tag.color,
                          borderColor: `${tag.color}40`,
                        }}
                      >
                        <i className={`fa-solid ${tag.icon}`} /> {tag.label}
                      </span>
                    )}
                    <span className="hub-kudos-wall-time">{timeAgo(k.created_at)}</span>
                  </div>

                  {/* 메시지 */}
                  <p className="hub-kudos-wall-message">{k.message}</p>

                  {/* 반응 영역 */}
                  <HubKudosReactions kudosId={k.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}