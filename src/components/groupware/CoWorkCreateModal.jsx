// components/groupware/CoWorkCreateModal.jsx
// 공동 작업 세션 생성 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useCoWork, COWORK_CATEGORIES } from '../../contexts/CoWorkContext';
import { useToast } from '../../contexts/ToastContext';

export default function CoWorkCreateModal() {
  const toast = useToast();
  const { createModalOpen, closeCreateModal, createSession } = useCoWork();

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [category, setCategory] = useState('focus');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!createModalOpen) return;
    setTitle('');
    setGoal('');
    setCategory('focus');
  }, [createModalOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('세션 제목을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const res = await createSession({ title, goal, category });
    setSubmitting(false);
    if (res.ok) {
      toast.success('세션을 시작했어요. 동료들이 합류할 수 있어요!');
      closeCreateModal();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal isOpen={createModalOpen} onClose={closeCreateModal} size="md" title="공동 작업 세션 시작">
      <div className="cowork-form">
        <label className="cowork-label">제목 <span style={{ color: '#ef4444' }}>*</span></label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) Q4 보고서 마무리, 신규 페이지 디자인 등"
          className="cowork-input"
          maxLength={100}
        />

        <label className="cowork-label">목표</label>
        <textarea
          rows={3}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="이번 세션에서 무엇을 끝내고 싶은가요?"
          className="cowork-textarea"
          maxLength={300}
        />

        <label className="cowork-label">카테고리</label>
        <div className="cowork-cat-grid">
          {COWORK_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`cowork-cat-btn ${category === c.value ? 'active' : ''}`}
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

        <p className="cowork-note">
          <i className="fa-solid fa-circle-info" /> 세션은 전사에 공개돼요. 혼자 시작해도 OK, 동료가 나중에 합류할 수 있어요.
        </p>
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeCreateModal} disabled={submitting}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '시작 중...' : <><i className="fa-solid fa-play" /> 세션 시작</>}
        </button>
      </div>
    </Modal>
  );
}