// components/feedback/FeedbackCard.jsx
// 피드백 단일 카드 — 리액션 + 관리자 응답 + 상태 변경.

import { useState, useEffect } from 'react';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useToast } from '../../contexts/ToastContext';
import { markResponsesSeen } from '../../lib/feedbackToken';
import FeedbackEditModal from './FeedbackEditModal';
import {
  getCategoryMeta,
  getSentimentMeta,
  getStatusMeta,
  FEEDBACK_STATUSES,
} from '../../config/feedbackTypes';
import { formatWeek } from '../../lib/feedbackBucket';

export default function FeedbackCard({ feedback }) {
  const {
    responses,
    myReactions,
    isMyFeedback,
    isAdmin,
    toggleReaction,
    respondToFeedback,
    deleteFeedback,
    updateStatus,
  } = useFeedback();
  const toast = useToast();

  const [expanded, setExpanded] = useState(false);
  const [responding, setResponding] = useState(false);
  const [respondText, setRespondText] = useState('');
  const [respondRole, setRespondRole] = useState('인사팀');
  const [submitting, setSubmitting] = useState(false);
   const [editing, setEditing] = useState(false);

  const cat = getCategoryMeta(feedback.category);
  const sent = getSentimentMeta(feedback.sentiment);
  const stat = getStatusMeta(feedback.status);
  const mine = isMyFeedback(feedback.id);
  const liked = myReactions.has(feedback.id);
  const fbResponses = responses[feedback.id] || [];
  const isLong = feedback.body && feedback.body.length > 280;
  const displayBody = !expanded && isLong
    ? feedback.body.slice(0, 280) + '...'
    : feedback.body;

  const handleToggleLike = async () => {
    const res = await toggleReaction(feedback.id);
    if (!res.ok) toast.error(res.error);
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까? 본인만 삭제 가능합니다.')) return;
    const res = await deleteFeedback(feedback.id);
    if (res.ok) toast.success('삭제했어요');
    else toast.error(res.error);
  };

  const handleRespond = async () => {
    if (respondText.trim().length < 5) {
      toast.warning('응답은 5자 이상 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const res = await respondToFeedback(feedback.id, respondText, respondRole);
    setSubmitting(false);
    if (res.ok) {
      toast.success('응답을 저장했어요');
      setResponding(false);
      setRespondText('');
    } else {
      toast.error(res.error);
    }
  };
/* 🔔 본인 글의 응답이 화면에 노출되면 "봤다" 마크 → 다음번 알림 안 뜸 */
  useEffect(() => {
    if (mine && fbResponses.length > 0) {
      markResponsesSeen(feedback.id, feedback.response_count || fbResponses.length);
    }
  }, [mine, feedback.id, feedback.response_count, fbResponses.length]);
  
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    const res = await updateStatus(feedback.id, newStatus);
    if (res.ok) toast.success('상태를 변경했어요');
    else toast.error(res.error);
  };

  return (
    <article className={`fb-card ${mine ? 'mine' : ''}`}>
      <div className="fb-card-head">
        <div className="fb-card-tags">
          <span
            className="fb-cat-badge"
            style={{ background: `${cat.color}22`, color: cat.color, borderColor: `${cat.color}55` }}
          >
            {cat.emoji} {cat.label}
          </span>
          <span
            className="fb-sent-badge"
            style={{ background: `${sent.color}18`, color: sent.color }}
          >
            {sent.emoji} {sent.label}
          </span>
          {mine && (
            <span className="fb-mine-badge" title="이 브라우저에서 작성한 글">
              <i className="fa-solid fa-key" /> 내 글
            </span>
          )}
        </div>

        <div className="fb-card-status">
          {isAdmin ? (
            <select
              className="fb-status-select"
              value={feedback.status}
              onChange={handleStatusChange}
              style={{ color: stat.color, borderColor: `${stat.color}55` }}
            >
              {FEEDBACK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          ) : (
            <span
              className="fb-status-badge"
              style={{ background: `${stat.color}22`, color: stat.color }}
            >
              {stat.label}
            </span>
          )}
        </div>
      </div>

      <h3 className="fb-card-title">{feedback.title}</h3>

      <p className="fb-card-body">
        {displayBody}
        {isLong && (
          <button
            type="button"
            className="fb-expand-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? ' 접기' : ' 더보기'}
          </button>
        )}
      </p>

      <div className="fb-card-meta">
        {feedback.dept_bucket && (
          <span><i className="fa-solid fa-users" /> {feedback.dept_bucket}</span>
        )}
        {feedback.tenure_bucket && (
          <span><i className="fa-solid fa-clock" /> {feedback.tenure_bucket}</span>
        )}
        <span><i className="fa-solid fa-calendar" /> {formatWeek(feedback.created_week)}</span>
        {feedback.target_label && (
          <span><i className="fa-solid fa-bullseye" /> {feedback.target_label}</span>
        )}
      </div>

      <div className="fb-card-actions">
        <button
          type="button"
          className={`fb-react-btn ${liked ? 'liked' : ''}`}
          onClick={handleToggleLike}
        >
          <i className={`${liked ? 'fa-solid' : 'fa-regular'} fa-heart`} />
          <span>나도 그래요</span>
          <strong>{feedback.reaction_count || 0}</strong>
        </button>

        <div className="fb-response-count">
          <i className="fa-solid fa-reply" /> 응답 {feedback.response_count || 0}
        </div>

<div className="fb-card-tools">
          {mine && (
            <>
              <button
                type="button"
                className="fb-tool-btn"
                onClick={() => setEditing(true)}
                title="수정"
              >
                <i className="fa-solid fa-pen" /> 수정
              </button>
              <button
                type="button"
                className="fb-tool-btn fb-tool-danger"
                onClick={handleDelete}
                title="삭제"
              >
                <i className="fa-solid fa-trash" />
              </button>
            </>
          )}
          {isAdmin && !responding && (
            <button
              type="button"
              className="fb-tool-btn fb-tool-primary"
              onClick={() => setResponding(true)}
            >
              <i className="fa-solid fa-reply" /> 응답하기
            </button>
          )}
        </div>
      </div>

      {/* 응답 작성 폼 (관리자) */}
      {responding && (
        <div className="fb-respond-form">
          <div className="fb-respond-row">
            <input
              type="text"
              className="fb-input"
              placeholder="응답자 역할 (예: 인사팀, 대표)"
              value={respondRole}
              onChange={(e) => setRespondRole(e.target.value)}
              style={{ maxWidth: 200 }}
            />
          </div>
          <textarea
            className="fb-textarea"
            rows={4}
            placeholder="피드백에 대한 응답을 작성해주세요. 솔직하고 구체적인 답변이 신뢰를 만듭니다."
            value={respondText}
            onChange={(e) => setRespondText(e.target.value)}
          />
          <div className="fb-respond-actions">
            <button
              type="button"
              className="fb-btn-ghost"
              onClick={() => { setResponding(false); setRespondText(''); }}
            >
              취소
            </button>
            <button
              type="button"
              className="fb-btn-primary"
              onClick={handleRespond}
              disabled={submitting}
            >
              {submitting ? '저장 중...' : '응답 저장'}
            </button>
          </div>
        </div>
      )}

{/* 응답 스레드 */}
      {fbResponses.length > 0 && (
        <div className="fb-response-thread">
          {fbResponses.map((r) => (
            <div key={r.id} className="fb-response">
              <div className="fb-response-head">
                <strong>
                  <i className="fa-solid fa-user-shield" /> {r.responder_role}
                </strong>
                <span className="fb-response-name">{r.responder_name}</span>
                <span className="fb-response-time">
                  {new Date(r.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* 수정 모달 — 본인 글에만 */}
      {editing && (
        <FeedbackEditModal
          feedback={feedback}
          onClose={() => setEditing(false)}
          onDone={() => setEditing(false)}
        />
      )}
    </article>
  );
}