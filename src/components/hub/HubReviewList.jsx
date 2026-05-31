// components/hub/HubReviewList.jsx
// 상품별 후기 목록 — 상점 카드 안 또는 별도 섹션에 표시.

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useHub } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';
import HubReviewModal from './HubReviewModal';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

function avatarUrl(uid) {
  return `https://i.pravatar.cc/150?u=${uid || 'x'}`;
}

export default function HubReviewList({ productId, product, compact = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const {
    reviewsByProduct,
    productRatings,
    helpfulsByReview,
    toggleHelpful,
    deleteReview,
  } = useHub();

  const reviews = reviewsByProduct[productId] || [];
  const rating = productRatings[productId];
  const [editTarget, setEditTarget] = useState(null);
  const [expanded, setExpanded] = useState(!compact);

  const handleHelpful = async (reviewId) => {
    const res = await toggleHelpful(reviewId);
    if (!res.ok) toast.error(res.error);
  };

  const handleDelete = async (review) => {
    if (!window.confirm('이 후기를 삭제할까요?')) return;
    const res = await deleteReview(review.id);
    if (res.ok) toast.success('후기를 삭제했어요.');
    else toast.error(res.error);
  };

  if (reviews.length === 0) {
    return (
      <div className="hub-review-empty">
        <i className="fa-regular fa-comment-dots" />
        <span>아직 후기가 없어요</span>
      </div>
    );
  }

  /* compact 모드 — 평점 + 최신 1개만 */
  if (compact && !expanded) {
    return (
      <div className="hub-review-compact">
        <div className="hub-review-summary">
          <div className="hub-review-summary-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <i
                key={n}
                className={`fa-solid fa-star ${n <= Math.round(rating?.average || 0) ? 'active' : ''}`}
              />
            ))}
            <strong>{rating?.average?.toFixed(1) || '-'}</strong>
            <span>({rating?.count || 0})</span>
          </div>
          <button
            type="button"
            className="hub-review-more-btn"
            onClick={() => setExpanded(true)}
          >
            후기 모두 보기 <i className="fa-solid fa-chevron-down" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hub-review-list">
      {/* 평점 요약 */}
      <div className="hub-review-summary">
        <div className="hub-review-summary-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <i
              key={n}
              className={`fa-solid fa-star ${n <= Math.round(rating?.average || 0) ? 'active' : ''}`}
            />
          ))}
          <strong>{rating?.average?.toFixed(1) || '-'}</strong>
          <span>({rating?.count || 0}개 후기)</span>
        </div>
        {compact && (
          <button
            type="button"
            className="hub-review-more-btn"
            onClick={() => setExpanded(false)}
          >
            접기 <i className="fa-solid fa-chevron-up" />
          </button>
        )}
      </div>

      {/* 후기 카드들 */}
      {reviews.map((r) => {
        const h = helpfulsByReview(r.id);
        const isMine = r.user_id === user?.id;
        return (
          <div key={r.id} className="hub-review-item">
            <div
              className="hub-review-avatar"
              style={{ backgroundImage: `url('${avatarUrl(r.user_id)}')` }}
            />
            <div className="hub-review-body">
              <div className="hub-review-head">
                <strong>{r.user_name}</strong>
                <div className="hub-review-item-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <i
                      key={n}
                      className={`fa-solid fa-star ${n <= r.rating ? 'active' : ''}`}
                    />
                  ))}
                </div>
                <span className="hub-review-time">{timeAgo(r.created_at)}</span>
                {isMine && (
                  <div className="hub-review-actions">
                    <button
                      type="button"
                      onClick={() => setEditTarget(r)}
                      title="수정"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      title="삭제"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                )}
              </div>
              <p className="hub-review-content">{r.content}</p>
              <button
                type="button"
                className={`hub-review-helpful ${h.mine ? 'active' : ''}`}
                onClick={() => handleHelpful(r.id)}
              >
                <i className="fa-solid fa-thumbs-up" />
                <span>도움됐어요</span>
                {h.count > 0 && <em>{h.count}</em>}
              </button>
            </div>
          </div>
        );
      })}

      {/* 수정 모달 */}
      <HubReviewModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        product={product}
        editing={editTarget}
      />
    </div>
  );
}