// components/groupware/AskBoard.jsx
// 그룹웨어 — 요청·도움 게시판.

import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsk, URGENCY_LEVELS, ASK_STATUSES } from '../../contexts/AskContext';
import { useToast } from '../../contexts/ToastContext';

function avatarUrlOf(uid) {
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

function fmtEstimate(min) {
  if (!min) return '';
  if (min < 60) return `~${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `~${h}시간`;
  return `~${h}시간 ${m}분`;
}

export default function AskBoard() {
  const toast = useToast();
  const { user } = useAuth();
  const {
    requests,
    openRequests,
    inProgress,
    resolved,
    allTags,
    openCreateModal,
    openResolveModal,
    claimRequest,
    unclaimRequest,
    cancelRequest,
    deleteRequest,
    loading,
  } = useAsk();

  const [tab, setTab] = useState('open'); // open | inProgress | resolved
  const [tagFilter, setTagFilter] = useState(null);
  const [busy, setBusy] = useState(null);

  const baseList =
    tab === 'open' ? openRequests : tab === 'inProgress' ? inProgress : resolved;

  const filtered = useMemo(() => {
    if (!tagFilter) return baseList;
    return baseList.filter((r) => (r.tags || []).includes(tagFilter));
  }, [baseList, tagFilter]);

  const handleClaim = async (r) => {
    setBusy(r.id);
    const res = await claimRequest(r.id);
    setBusy(null);
    if (res.ok) toast.success(`"${r.title}" 요청을 잡았어요! 🙌`);
    else toast.error(res.error);
  };

  const handleUnclaim = async (r) => {
    if (!window.confirm('이 요청에서 손을 뗄까요?')) return;
    setBusy(r.id);
    const res = await unclaimRequest(r.id);
    setBusy(null);
    if (res.ok) toast.info('요청을 다시 열린 상태로 돌렸어요.');
    else toast.error(res.error);
  };

  const handleCancel = async (r) => {
    if (!window.confirm('이 요청을 취소할까요?')) return;
    const res = await cancelRequest(r.id);
    if (res.ok) toast.info('요청을 취소했어요.');
    else toast.error(res.error);
  };

  const handleDelete = async (r) => {
    if (!window.confirm('이 요청을 삭제할까요? 되돌릴 수 없어요.')) return;
    const res = await deleteRequest(r.id);
    if (res.ok) toast.success('요청을 삭제했어요.');
    else toast.error(res.error);
  };

  return (
    <div className="bento-card card-ask-board">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-hand" style={{ color: '#f59e0b' }} />
          요청·도움 게시판
          {openRequests.length > 0 && (
            <span className="ask-count-badge">
              <span className="ask-pulse" />
              {openRequests.length}
            </span>
          )}
        </h3>
        <button type="button" className="ask-new-btn" onClick={openCreateModal}>
          <i className="fa-solid fa-plus" /> 도움 요청
        </button>
      </div>

      {/* 탭 */}
      <div className="ask-tabs">
        <button
          type="button"
          className={`ask-tab ${tab === 'open' ? 'active' : ''}`}
          onClick={() => setTab('open')}
        >
          <i className="fa-solid fa-hand" /> 열린 요청
          <span className="ask-tab-count">{openRequests.length}</span>
        </button>
        <button
          type="button"
          className={`ask-tab ${tab === 'inProgress' ? 'active' : ''}`}
          onClick={() => setTab('inProgress')}
        >
          <i className="fa-solid fa-spinner" /> 진행 중
          <span className="ask-tab-count">{inProgress.length}</span>
        </button>
        <button
          type="button"
          className={`ask-tab ${tab === 'resolved' ? 'active' : ''}`}
          onClick={() => setTab('resolved')}
        >
          <i className="fa-solid fa-check" /> 해결됨
          <span className="ask-tab-count">{resolved.length}</span>
        </button>
      </div>

      {/* 태그 필터 */}
      {allTags.length > 0 && (
        <div className="ask-tag-filter">
          <button
            type="button"
            className={`ask-tag-chip ${!tagFilter ? 'active' : ''}`}
            onClick={() => setTagFilter(null)}
          >
            전체
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`ask-tag-chip ${tagFilter === t ? 'active' : ''}`}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* 리스트 */}
      <div className="ask-list">
        {loading && filtered.length === 0 ? (
          <div className="ask-empty">
            <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="ask-empty">
            <i className="fa-regular fa-hand" />
            <p>
              {tab === 'open' && '지금 도움이 필요한 요청이 없어요.'}
              {tab === 'inProgress' && '진행 중인 요청이 없어요.'}
              {tab === 'resolved' && '해결된 요청이 없어요.'}
            </p>
            {tab === 'open' && (
              <button type="button" className="ask-empty-btn" onClick={openCreateModal}>
                첫 요청 올리기
              </button>
            )}
          </div>
        ) : (
          filtered.map((r) => {
            const u = URGENCY_LEVELS.find((x) => x.value === r.urgency);
            const isRequester = r.requester_id === user?.id;
            const isHelper = r.helper_id === user?.id;
            const status = ASK_STATUSES.find((s) => s.value === r.status);

            return (
              <div key={r.id} className={`ask-item urgency-${r.urgency} status-${r.status}`}>
                <div className="ask-item-stripe" style={{ background: u?.color }} />
                <div className="ask-item-body">
                  <div className="ask-item-head">
                    <div className="ask-item-meta">
                      <div
                        className="ask-avatar"
                        style={{ backgroundImage: `url('${avatarUrlOf(r.requester_id)}')` }}
                      />
                      <div>
                        <strong>{r.requester_name || '동료'}</strong>
                        {r.requester_department && (
                          <span className="ask-dept">{r.requester_department}</span>
                        )}
                      </div>
                    </div>
                    <div className="ask-item-badges">
                      <span
                        className="ask-urgency-tag"
                        style={{ background: `${u?.color}15`, color: u?.color, borderColor: `${u?.color}40` }}
                      >
                        <i className={`fa-solid ${u?.icon}`} /> {u?.label}
                      </span>
                      {r.estimated_minutes && (
                        <span className="ask-estimate">
                          <i className="fa-solid fa-clock" /> {fmtEstimate(r.estimated_minutes)}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="ask-title">{r.title}</h4>
                  {r.description && <p className="ask-desc">{r.description}</p>}

                  {(r.tags || []).length > 0 && (
                    <div className="ask-tags">
                      {r.tags.map((t) => (
                        <span key={t} className="ask-tag-small">
                          # {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 도움자 표시 */}
                  {r.helper_id && (
                    <div className="ask-helper">
                      <i className="fa-solid fa-user-check" />
                      <strong>{r.helper_name}</strong> 님이
                      {r.status === 'resolved' ? ' 도와줬어요' : ' 도와주고 있어요'}
                      <span className="ask-claimed-time">· {timeAgo(r.claimed_at)}</span>
                    </div>
                  )}

                  {r.resolve_note && (
                    <div className="ask-resolve-note">
                      <i className="fa-solid fa-quote-left" /> {r.resolve_note}
                    </div>
                  )}

                  {/* 푸터 */}
                  <div className="ask-item-foot">
                    <div className="ask-foot-left">
                      <span
                        className="ask-status-tag"
                        style={{ color: status?.color }}
                      >
                        <i className={`fa-solid ${status?.icon}`} /> {status?.label}
                      </span>
                      <span className="ask-foot-time">· {timeAgo(r.created_at)}</span>
                    </div>

                    <div className="ask-actions">
                      {/* 열린 요청 → 잡기 */}
                      {r.status === 'open' && !isRequester && (
                        <button
                          type="button"
                          className="ask-action-btn primary"
                          onClick={() => handleClaim(r)}
                          disabled={busy === r.id}
                        >
                          <i className="fa-solid fa-hand-holding-hand" /> 내가 도울게요
                        </button>
                      )}
                      {/* 진행 중 → 도움자: 양보 */}
                      {r.status === 'claimed' && isHelper && (
                        <button
                          type="button"
                          className="ask-action-btn ghost"
                          onClick={() => handleUnclaim(r)}
                          disabled={busy === r.id}
                        >
                          <i className="fa-solid fa-arrow-rotate-left" /> 양보하기
                        </button>
                      )}
                      {/* 진행 중 → 요청자: 해결 처리 */}
                      {r.status === 'claimed' && isRequester && (
                        <button
                          type="button"
                          className="ask-action-btn primary"
                          onClick={() => openResolveModal(r)}
                        >
                          <i className="fa-solid fa-check" /> 해결 완료
                        </button>
                      )}
                      {/* 열린 요청 → 요청자: 취소 */}
                      {r.status === 'open' && isRequester && (
                        <button
                          type="button"
                          className="ask-action-btn ghost"
                          onClick={() => handleCancel(r)}
                        >
                          <i className="fa-solid fa-xmark" /> 취소
                        </button>
                      )}
                      {/* 요청자: 삭제 */}
                      {isRequester && (
                        <button
                          type="button"
                          className="ask-icon-btn danger"
                          onClick={() => handleDelete(r)}
                          title="삭제"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}