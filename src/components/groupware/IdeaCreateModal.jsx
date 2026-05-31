// components/groupware/IdeaCreateModal.jsx
// 아이디어 카드 작성/수정 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useIdea, IDEA_CATEGORIES } from '../../contexts/IdeaContext';
import { useToast } from '../../contexts/ToastContext';

export default function IdeaCreateModal() {
  const toast = useToast();
  const {
    createModalOpen,
    closeCreateModal,
    editingCard,
    createCard,
    updateCard,
  } = useIdea();

  const open = !!createModalOpen;
  const preset = createModalOpen?.preset;
  const isEdit = !!editingCard;

  const [category, setCategory] = useState('idea');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setCategory(editingCard.category);
      setTitle(editingCard.title);
      setContent(editingCard.content || '');
    } else {
      setCategory(preset || 'idea');
      setTitle('');
      setContent('');
    }
  }, [open, isEdit, editingCard, preset]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const res = isEdit
      ? await updateCard(editingCard.id, { category, title: title.trim(), content: content.trim() })
      : await createCard({ category, title, content });
    setSubmitting(false);
    if (res.ok) {
      toast.success(isEdit ? '카드를 수정했어요.' : '카드를 추가했어요.');
      closeCreateModal();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={closeCreateModal}
      size="md"
      title={isEdit ? '카드 수정' : '아이디어 카드 추가'}
    >
      <div className="idea-form">
        <label className="idea-label">카테고리</label>
        <div className="idea-cat-grid">
          {IDEA_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`idea-cat-btn ${category === c.value ? 'active' : ''}`}
              style={
                category === c.value
                  ? { background: c.color, borderColor: c.color, color: '#fff' }
                  : { color: c.color, borderColor: `${c.color}50` }
              }
              onClick={() => setCategory(c.value)}
            >
              <i className={`fa-solid ${c.icon}`} />
              {c.label}
            </button>
          ))}
        </div>

        <label className="idea-label">
          제목 <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="간단한 한 줄로 적어주세요."
          className="idea-input"
          maxLength={120}
        />

        <label className="idea-label">내용</label>
        <textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="배경, 제안, 시나리오 등을 자유롭게 적어주세요."
          className="idea-textarea"
        />

        <p className="idea-note">
          <i className="fa-solid fa-circle-info" /> 카드는 같은 부서원들에게만 보여요.
        </p>
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeCreateModal} disabled={submitting}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '저장 중...' : <><i className="fa-solid fa-paper-plane" /> {isEdit ? '수정' : '추가'}</>}
        </button>
      </div>
    </Modal>
  );
}