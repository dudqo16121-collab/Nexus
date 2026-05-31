// components/hub/HubReviewModal.jsx
// 상품 후기 작성/수정 모달.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useHub } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

export default function HubReviewModal({ isOpen, onClose, product, purchase, editing }) {
  const toast = useToast();
  const { createReview, updateReview } = useHub();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!editing;

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setRating(editing.rating);
      setContent(editing.content);
    } else {
      setRating(5);
      setContent('');
    }
    setHoverRating(0);
  }, [isOpen, editing]);

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.warning('별점을 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      toast.warning('후기 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    let res;
    if (isEdit) {
      res = await updateReview(editing.id, { rating, content });
    } else {
      res = await createReview({
        productId: product?.id,
        purchaseId: purchase?.id,
        rating,
        content,
      });
    }
    setSubmitting(false);

    if (res.ok) {
      if (isEdit) {
        toast.success('후기를 수정했어요.');
      } else {
        toast.success(`후기를 등록했어요! +${res.points}P 적립`);
      }
      onClose();
    } else {
      toast.error(res.error);
    }
  };

  if (!product && !editing) return null;

  /* 별점 라벨 */
  const ratingLabel = ['', '별로예요', '아쉬워요', '괜찮아요', '좋아요', '최고예요'][rating];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={isEdit ? '후기 수정' : '후기 작성'}
    >
      <div className="hub-review-form">
        {/* 상품 정보 */}
        {product && (
          <div className="hub-review-product">
            <div
              className="hub-review-product-icon"
              style={{
                background: `${product.color || '#4361ee'}15`,
                color: product.color || '#4361ee',
              }}
            >
              <i className={`fa-solid ${product.icon || 'fa-gift'}`} />
            </div>
            <div>
              <strong>{product.name}</strong>
              <span>{product.price_points}P로 구매</span>
            </div>
          </div>
        )}

        {/* 별점 */}
        <div className="hub-review-rating">
          <div className="hub-review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`hub-review-star ${n <= (hoverRating || rating) ? 'active' : ''}`}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
              >
                <i className="fa-solid fa-star" />
              </button>
            ))}
          </div>
          <div className="hub-review-rating-label">
            {ratingLabel}
          </div>
        </div>

        {/* 후기 텍스트 */}
        <label className="hub-review-label">
          후기 <span className="hub-review-label-hint">— 다른 동료에게 도움이 되도록 솔직하게 적어주세요</span>
        </label>
        <textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="어떤 점이 좋았나요? 어떻게 사용하셨나요?"
          className="hub-review-textarea"
          maxLength={500}
        />
        <div className="hub-review-charcount">
          {content.length} / 500
        </div>

        {!isEdit && (
          <div className="hub-review-bonus">
            <i className="fa-solid fa-coins" />
            <span>후기 작성 시 <strong>+20P</strong> 보너스 적립</span>
          </div>
        )}
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={onClose} disabled={submitting}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '저장 중...' : isEdit ? '수정' : <><i className="fa-solid fa-paper-plane" /> 후기 등록</>}
        </button>
      </div>
    </Modal>
  );
}