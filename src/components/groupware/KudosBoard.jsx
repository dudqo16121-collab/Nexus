// components/groupware/KudosBoard.jsx
// 그룹웨어 — 칭찬 보드 위젯.
// 기존 HubContext 의 kudos / sendKudos 를 그대로 활용.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useHub, KUDOS_TAGS } from '../../contexts/HubContext';
import { useOrgChart } from '../../contexts/OrgChartContext';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function KudosBoard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kudos, loading, openSendKudos } = useHub();
  const { members } = useOrgChart() || { members: [] };

  const findUser = (id) => members.find((u) => u.id === id);
  const findTag = (id) => KUDOS_TAGS.find((t) => t.id === id);

  /* 이번 달 받은 칭찬 TOP 3 */
  const topReceivers = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const counts = {};
    for (const k of kudos) {
      const t = new Date(k.created_at).getTime();
      if (t >= monthStart) {
        counts[k.to_id] = (counts[k.to_id] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([uid, cnt]) => ({ user: findUser(uid), count: cnt, uid }))
      .filter((x) => x.user)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kudos, members]);

  /* 최근 칭찬 5개 */
  const recent = kudos.slice(0, 5);

  return (
    <div className="bento-card card-kudos-board">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-heart" style={{ color: '#f72585' }} />
          칭찬 보드
        </h3>
        <button
          type="button"
          onClick={() => openSendKudos()}
          style={{
            background: 'linear-gradient(135deg, #f72585, #ec4899)',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.82rem',
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="fa-solid fa-paper-plane" /> 칭찬 보내기
        </button>
      </div>

      {/* 이번 달 TOP 3 */}
      {topReceivers.length > 0 && (
        <div className="kudos-top3">
          <div className="kudos-top3-label">
            <i className="fa-solid fa-crown" style={{ color: '#f59e0b' }} />
            이번 달 칭찬 많이 받은 동료
          </div>
          <div className="kudos-top3-list">
            {topReceivers.map((r, idx) => (
              <div key={r.uid} className="kudos-top3-item">
                <span className={`kudos-rank kudos-rank-${idx + 1}`}>{idx + 1}</span>
                <div
                  className="kudos-top3-avatar"
                  style={{ backgroundImage: `url('${avatarUrl(r.user)}')` }}
                />
                <div className="kudos-top3-info">
                  <strong>{r.user.full_name || '동료'}</strong>
                  <span>{r.user.department || '-'}</span>
                </div>
                <span className="kudos-top3-count">
                  <i className="fa-solid fa-heart" /> {r.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 칭찬 피드 */}
      <div className="kudos-feed">
        {loading && recent.length === 0 ? (
          <div className="kudos-empty">
            <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
          </div>
        ) : recent.length === 0 ? (
          <div className="kudos-empty">
            <i className="fa-regular fa-comment-dots" />
            <p>아직 칭찬이 없어요.</p>
            <button
              type="button"
              className="kudos-empty-btn"
              onClick={() => openSendKudos()}
            >
              첫 칭찬 보내기
            </button>
          </div>
        ) : (
          recent.map((k) => {
            const from = findUser(k.from_id);
            const to = findUser(k.to_id);
            const tag = findTag(k.tag);
            return (
              <div key={k.id} className="kudos-item">
                <div
                  className="kudos-avatar"
                  style={{ backgroundImage: `url('${avatarUrl(from)}')` }}
                />
                <div className="kudos-body">
                  <div className="kudos-line">
                    <strong>{from?.full_name || '동료'}</strong>
                    <i className="fa-solid fa-arrow-right kudos-arrow" />
                    <strong>{to?.full_name || '동료'}</strong>
                    {tag && (
                      <span
                        className="kudos-tag"
                        style={{
                          background: `${tag.color}15`,
                          color: tag.color,
                          borderColor: `${tag.color}40`,
                        }}
                      >
                        <i className={`fa-solid ${tag.icon}`} /> {tag.label}
                      </span>
                    )}
                  </div>
                  <p className="kudos-msg">{k.message}</p>
                  <span className="kudos-time">{timeAgo(k.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 더 보기 */}
      <button
        type="button"
        className="kudos-more-btn"
        onClick={() => navigate('/injoyhub')}
      >
        INJOY Hub 에서 전체 보기 <i className="fa-solid fa-arrow-right" />
      </button>
    </div>
  );
}