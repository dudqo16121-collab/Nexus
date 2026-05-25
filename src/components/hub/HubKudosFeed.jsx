// 칭찬 피드 — 전체 칭찬 활동 타임라인.

import { useHub, KUDOS_TAGS } from '../../contexts/HubContext';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { SkeletonList } from '../../components/common/Skeleton';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function HubKudosFeed() {
  const { kudos, loading } = useHub();
  const { members } = useOrgChart() || { members: [] };
  const findUser = (id) => members.find((u) => u.id === id);

  const recent = kudos.slice(0, 12);

  return (
    <section className="hub-card">
      <header className="hub-card-header">
        <h3>
          <i className="fa-solid fa-stream" style={{ color: 'var(--primary-color)' }} />
          최근 활동
        </h3>
      </header>

      <div className="hub-feed">
        {loading ? (
          <SkeletonList count={5} />
        ) : recent.length === 0 ? (
          <div className="hub-empty">
            <i className="fa-regular fa-comment-dots" />
            <p>아직 칭찬이 없어요. 첫 칭찬을 보내보세요!</p>
          </div>
        ) : (
          recent.map((k) => {
            const from = findUser(k.from_id);
            const to = findUser(k.to_id);
            const tag = KUDOS_TAGS.find((t) => t.id === k.tag) || KUDOS_TAGS[0];

            return (
              <div key={k.id} className="hub-feed-item">
                <div
                  className="hub-feed-avatars"
                  style={{ color: tag.color }}
                >
                  <div
                    className="hub-feed-avatar"
                    style={{ backgroundImage: `url('${avatarUrl(from)}')` }}
                  />
                  <i className={`fa-solid ${tag.icon}`} />
                  <div
                    className="hub-feed-avatar"
                    style={{ backgroundImage: `url('${avatarUrl(to)}')` }}
                  />
                </div>

                <div className="hub-feed-body">
                  <div className="hub-feed-line">
                    <strong>{from?.full_name || '익명'}</strong>
                    <span style={{ color: 'var(--text-muted)' }}> 님이 </span>
                    <strong>{to?.full_name || '익명'}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>님에게 </span>
                    <span className="hub-feed-tag" style={{ color: tag.color }}>
                      {tag.label}
                    </span>
                  </div>
                  {k.message && <p className="hub-feed-message">"{k.message}"</p>}
                  <span className="hub-feed-time">{timeAgo(k.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}