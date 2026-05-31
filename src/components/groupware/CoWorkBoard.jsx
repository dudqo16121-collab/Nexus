// components/groupware/CoWorkBoard.jsx
// 그룹웨어 — 공동 작업 세션 보드.

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCoWork, COWORK_CATEGORIES, OUTCOMES } from '../../contexts/CoWorkContext';
import { useToast } from '../../contexts/ToastContext';

function avatarUrlOf(uid) {
  return `https://i.pravatar.cc/150?u=${uid || 'x'}`;
}

function elapsed(start) {
  const ms = Date.now() - new Date(start).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return '방금 시작';
  if (min < 60) return `${min}분 진행 중`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}시간 ${m}분 진행 중`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function CoWorkBoard() {
  const toast = useToast();
  const { user } = useAuth();
  const {
    activeSessions,
    recentEnded,
    sessionMembers,
    openCreateModal,
    openRetroModal,
    joinSession,
    leaveSession,
    deleteSession,
    loading,
  } = useCoWork();

  /* 진행 시간 1분마다 갱신용 */
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const [busy, setBusy] = useState(null);

  const handleJoin = async (s) => {
    setBusy(s.id);
    const res = await joinSession(s.id);
    setBusy(null);
    if (res.ok) toast.success(`'${s.title}' 세션에 합류했어요!`);
    else toast.error(res.error);
  };

  const handleLeave = async (s) => {
    setBusy(s.id);
    const res = await leaveSession(s.id);
    setBusy(null);
    if (res.ok) toast.info('세션에서 나왔어요.');
    else toast.error(res.error);
  };

  const handleDelete = async (s) => {
    if (!window.confirm('이 세션을 삭제할까요? 모든 기록이 사라져요.')) return;
    const res = await deleteSession(s.id);
    if (res.ok) toast.success('세션을 삭제했어요.');
    else toast.error(res.error);
  };

  return (
    <div className="bento-card card-cowork-board">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-handshake-angle" style={{ color: '#06d6a0' }} />
          공동 작업 세션
          {activeSessions.length > 0 && (
            <span className="cowork-count-badge">
              <span className="cowork-pulse" />
              {activeSessions.length}
            </span>
          )}
        </h3>
        <button type="button" className="cowork-start-btn" onClick={openCreateModal}>
          <i className="fa-solid fa-play" /> 세션 시작
        </button>
      </div>

      {/* 활성 세션 리스트 */}
      <div className="cowork-section">
        <div className="cowork-section-title">
          <i className="fa-solid fa-circle-dot" style={{ color: '#22c55e' }} />
          진행 중인 세션
        </div>

        {loading && activeSessions.length === 0 ? (
          <div className="cowork-empty">
            <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="cowork-empty">
            <i className="fa-solid fa-mug-saucer" />
            <p>지금 진행 중인 세션이 없어요.</p>
            <p className="cowork-empty-sub">동료와 함께 일하거나 혼자 집중 세션을 시작해보세요.</p>
            <button type="button" className="cowork-empty-btn" onClick={openCreateModal}>
              첫 세션 시작하기
            </button>
          </div>
        ) : (
          <div className="cowork-list">
            {activeSessions.map((s) => {
              const cat = COWORK_CATEGORIES.find((c) => c.value === s.category);
              const mems = sessionMembers(s.id);
              const isHost = s.host_id === user?.id;
              const iAmMember = mems.some((m) => m.user_id === user?.id);
              return (
                <div key={s.id} className="cowork-card active">
                  {/* 카테고리 stripe */}
                  <div
                    className="cowork-stripe"
                    style={{ background: cat?.color || '#64748b' }}
                  />
                  <div className="cowork-card-body">
                    <div className="cowork-card-head">
                      <span
                        className="cowork-cat-tag"
                        style={{ background: `${cat?.color}15`, color: cat?.color, borderColor: `${cat?.color}40` }}
                      >
                        <i className={`fa-solid ${cat?.icon}`} /> {cat?.label}
                      </span>
                      <span className="cowork-elapsed">
                        <span className="cowork-pulse small" />
                        {elapsed(s.started_at)}
                      </span>
                    </div>

                    <h4 className="cowork-title">{s.title}</h4>
                    {s.goal && <p className="cowork-goal">{s.goal}</p>}

                    {/* 참여자 */}
                    <div className="cowork-members">
                      <div className="cowork-avatars">
                        {mems.slice(0, 5).map((m) => (
                          <div
                            key={m.id}
                            className="cowork-avatar"
                            style={{ backgroundImage: `url('${avatarUrlOf(m.user_id)}')` }}
                            title={m.user_name}
                          />
                        ))}
                        {mems.length > 5 && (
                          <div className="cowork-avatar more">+{mems.length - 5}</div>
                        )}
                      </div>
                      <span className="cowork-host">
                        <i className="fa-solid fa-crown" />
                        {s.host_name || '동료'}
                      </span>
                    </div>

                    {/* 액션 */}
                    <div className="cowork-actions">
                      {!iAmMember && (
                        <button
                          type="button"
                          className="cowork-action-btn primary"
                          onClick={() => handleJoin(s)}
                          disabled={busy === s.id}
                        >
                          <i className="fa-solid fa-user-plus" /> 합류하기
                        </button>
                      )}
                      {iAmMember && !isHost && (
                        <button
                          type="button"
                          className="cowork-action-btn ghost"
                          onClick={() => handleLeave(s)}
                          disabled={busy === s.id}
                        >
                          <i className="fa-solid fa-arrow-right-from-bracket" /> 나가기
                        </button>
                      )}
                      {isHost && (
                        <>
                          <button
                            type="button"
                            className="cowork-action-btn primary"
                            onClick={() => openRetroModal(s)}
                          >
                            <i className="fa-solid fa-flag-checkered" /> 종료 + 회고
                          </button>
                          <button
                            type="button"
                            className="cowork-action-btn danger"
                            onClick={() => handleDelete(s)}
                            title="삭제"
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 최근 종료된 세션 */}
      {recentEnded.length > 0 && (
        <div className="cowork-section">
          <div className="cowork-section-title">
            <i className="fa-solid fa-check-circle" style={{ color: '#94a3b8' }} />
            최근 마친 세션
          </div>
          <div className="cowork-ended-list">
            {recentEnded.map((s) => {
              const oc = OUTCOMES.find((o) => o.value === s.outcome);
              const cat = COWORK_CATEGORIES.find((c) => c.value === s.category);
              return (
                <div key={s.id} className="cowork-ended-item">
                  <i
                    className={`fa-solid ${oc?.icon || 'fa-circle'}`}
                    style={{ color: oc?.color || 'var(--text-muted)' }}
                  />
                  <div className="cowork-ended-body">
                    <div className="cowork-ended-title">
                      {cat && <span style={{ color: cat.color }}>[{cat.label}]</span>}
                      {' '}{s.title}
                    </div>
                    <div className="cowork-ended-meta">
                      <span>{s.host_name}</span>
                      <span>·</span>
                      <span>{oc?.label || '종료'}</span>
                      <span>·</span>
                      <span>{timeAgo(s.ended_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}