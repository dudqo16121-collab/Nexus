// components/groupware/IdeaBoard.jsx
// 그룹웨어 — 부서별 아이디어 보드 (Idea Wall).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIdea, IDEA_CATEGORIES, REACTIONS } from '../../contexts/IdeaContext';
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

export default function IdeaBoard() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    cardsByCategory,
    myDept,
    expandedCardId,
    toggleExpand,
    openCreateModal,
    openEditModal,
    reactionsOf,
    commentsOf,
    toggleReaction,
    addComment,
    deleteComment,
    deleteCard,
    promoteToWiki,
    loading,
  } = useIdea();

  const [activeTab, setActiveTab] = useState('idea');
  const [commentInputs, setCommentInputs] = useState({}); // cardId -> string

  const activeCat = IDEA_CATEGORIES.find((c) => c.value === activeTab);
  const list = cardsByCategory[activeTab] || [];

  const handleReaction = async (cardId, reaction) => {
    const res = await toggleReaction(cardId, reaction);
    if (!res.ok) toast.error(res.error);
  };

  const handleSubmitComment = async (cardId) => {
    const text = commentInputs[cardId] || '';
    if (!text.trim()) return;
    const res = await addComment(cardId, text);
    if (res.ok) {
      setCommentInputs((prev) => ({ ...prev, [cardId]: '' }));
    } else {
      toast.error(res.error);
    }
  };

  const handlePromote = async (card) => {
    if (!window.confirm(`"${card.title}" 카드를 위키 문서로 승격시킬까요?\n댓글까지 함께 위키에 옮겨져요.`)) return;
    const res = await promoteToWiki(card.id);
    if (res.ok) {
      toast.success('위키 문서로 승격됐어요!');
      // 위키로 바로 이동
      navigate(`/wiki?doc=${res.wikiId}`);
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (card) => {
    if (!window.confirm('이 카드를 삭제할까요? 댓글과 반응도 함께 사라져요.')) return;
    const res = await deleteCard(card.id);
    if (res.ok) toast.success('카드를 삭제했어요.');
    else toast.error(res.error);
  };

  if (!myDept) {
    return (
      <div className="bento-card card-idea-board">
        <div className="bento-header">
          <h3>
            <i className="fa-solid fa-lightbulb" style={{ color: '#f59e0b' }} />
            아이디어 보드
          </h3>
        </div>
        <div className="idea-empty">
          <i className="fa-solid fa-circle-info" />
          <p>부서 정보가 없어 보드를 표시할 수 없어요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card card-idea-board">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-lightbulb" style={{ color: '#f59e0b' }} />
          아이디어 보드
          <span className="idea-dept-tag">{myDept}</span>
        </h3>
        <button type="button" className="idea-new-btn" onClick={() => openCreateModal(activeTab)}>
          <i className="fa-solid fa-plus" /> 카드 추가
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="idea-tabs">
        {IDEA_CATEGORIES.map((c) => {
          const count = (cardsByCategory[c.value] || []).length;
          return (
            <button
              key={c.value}
              type="button"
              className={`idea-tab ${activeTab === c.value ? 'active' : ''}`}
              style={
                activeTab === c.value
                  ? { background: c.color, borderColor: c.color, color: '#fff' }
                  : { color: c.color, borderColor: `${c.color}40` }
              }
              onClick={() => setActiveTab(c.value)}
            >
              <i className={`fa-solid ${c.icon}`} />
              {c.label}
              <span className="idea-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* 카드 그리드 */}
      <div className="idea-list">
        {loading && list.length === 0 ? (
          <div className="idea-empty">
            <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
          </div>
        ) : list.length === 0 ? (
          <div className="idea-empty">
            <i className={`fa-solid ${activeCat?.icon}`} style={{ color: activeCat?.color }} />
            <p>{activeCat?.label} 카드가 아직 없어요.</p>
            <button
              type="button"
              className="idea-empty-btn"
              onClick={() => openCreateModal(activeTab)}
              style={{ background: activeCat?.color }}
            >
              첫 {activeCat?.label} 카드 추가
            </button>
          </div>
        ) : (
          list.map((card) => {
            const { counts, mine } = reactionsOf(card.id);
            const cmts = commentsOf(card.id);
            const isAuthor = card.author_id === user?.id;
            const expanded = expandedCardId === card.id;
            const isPromoted = card.status === 'promoted';

            return (
              <div
                key={card.id}
                className={`idea-card ${expanded ? 'expanded' : ''} ${isPromoted ? 'promoted' : ''}`}
              >
                <div
                  className="idea-card-stripe"
                  style={{ background: activeCat?.color }}
                />
                <div className="idea-card-body">
                  <div className="idea-card-head">
                    <div className="idea-card-author">
                      <div
                        className="idea-author-avatar"
                        style={{ backgroundImage: `url('${avatarUrlOf(card.author_id)}')` }}
                      />
                      <div>
                        <strong>{card.author_name || '동료'}</strong>
                        <span className="idea-card-time">{timeAgo(card.created_at)}</span>
                      </div>
                    </div>
                    {isPromoted && (
                      <span className="idea-promoted-badge">
                        <i className="fa-solid fa-check-double" /> 위키 승격됨
                      </span>
                    )}
                  </div>

                  <h4 className="idea-card-title">{card.title}</h4>
                  {card.content && (
                    <p className={`idea-card-content ${expanded ? 'full' : ''}`}>
                      {card.content}
                    </p>
                  )}

                  {/* 반응 */}
                  <div className="idea-reactions">
                    {REACTIONS.map((r) => {
                      const count = counts[r.value] || 0;
                      const mineHere = mine.has(r.value);
                      return (
                        <button
                          key={r.value}
                          type="button"
                          className={`idea-reaction-btn ${mineHere ? 'mine' : ''}`}
                          onClick={() => handleReaction(card.id, r.value)}
                          title={r.label}
                        >
                          <span className="idea-emoji">{r.emoji}</span>
                          {count > 0 && <span className="idea-reaction-count">{count}</span>}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      className="idea-comment-toggle"
                      onClick={() => toggleExpand(card.id)}
                    >
                      <i className="fa-regular fa-comment" />
                      {cmts.length > 0 && <span>{cmts.length}</span>}
                    </button>

                    <div className="idea-card-actions">
                      {isAuthor && !isPromoted && (
                        <>
                          <button
                            type="button"
                            className="idea-action-icon"
                            onClick={() => openEditModal(card)}
                            title="수정"
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            type="button"
                            className="idea-action-icon promote"
                            onClick={() => handlePromote(card)}
                            title="위키로 승격"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square" />
                          </button>
                        </>
                      )}
                      {isPromoted && card.promoted_to_wiki && (
                        <button
                          type="button"
                          className="idea-action-icon"
                          onClick={() => navigate(`/wiki?doc=${card.promoted_to_wiki}`)}
                          title="위키 문서 보기"
                        >
                          <i className="fa-solid fa-book" />
                        </button>
                      )}
                      {isAuthor && (
                        <button
                          type="button"
                          className="idea-action-icon danger"
                          onClick={() => handleDelete(card)}
                          title="삭제"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 댓글 영역 */}
                  {expanded && (
                    <div className="idea-comments">
                      {cmts.length > 0 ? (
                        cmts.map((c) => (
                          <div key={c.id} className="idea-comment">
                            <div
                              className="idea-comment-avatar"
                              style={{ backgroundImage: `url('${avatarUrlOf(c.author_id)}')` }}
                            />
                            <div className="idea-comment-body">
                              <div className="idea-comment-head">
                                <strong>{c.author_name || '동료'}</strong>
                                <span>{timeAgo(c.created_at)}</span>
                                {c.author_id === user?.id && (
                                  <button
                                    type="button"
                                    className="idea-comment-del"
                                    onClick={() => deleteComment(c.id)}
                                    title="삭제"
                                  >
                                    <i className="fa-solid fa-xmark" />
                                  </button>
                                )}
                              </div>
                              <p>{c.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="idea-comment-empty">첫 댓글을 남겨보세요.</div>
                      )}

                      <div className="idea-comment-input-row">
                        <input
                          type="text"
                          value={commentInputs[card.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [card.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmitComment(card.id);
                          }}
                          placeholder="댓글 남기기..."
                          className="idea-comment-input"
                        />
                        <button
                          type="button"
                          className="idea-comment-send"
                          onClick={() => handleSubmitComment(card.id)}
                          disabled={!(commentInputs[card.id] || '').trim()}
                        >
                          <i className="fa-solid fa-paper-plane" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}