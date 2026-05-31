// components/groupware/AskCreateModal.jsx
// 요청 생성 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useAsk, URGENCY_LEVELS } from '../../contexts/AskContext';
import { useToast } from '../../contexts/ToastContext';

const ESTIMATE_PRESETS = [
  { label: '5분', value: 5 },
  { label: '15분', value: 15 },
  { label: '30분', value: 30 },
  { label: '1시간', value: 60 },
  { label: '2시간', value: 120 },
];

export default function AskCreateModal() {
  const toast = useToast();
  const { createModalOpen, closeCreateModal, createRequest, allTags } = useAsk();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [estimate, setEstimate] = useState(30);
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!createModalOpen) return;
    setTitle('');
    setDescription('');
    setTagInput('');
    setTags([]);
    setEstimate(30);
    setUrgency('normal');
  }, [createModalOpen]);

  const addTag = (val) => {
    const t = (val || tagInput).trim().replace(/,/g, '');
    if (!t) return;
    if (tags.length >= 8) {
      toast.warning('태그는 최대 8개까지 추가할 수 있어요.');
      return;
    }
    if (tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagInput('');
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const res = await createRequest({
      title,
      description,
      tags,
      estimatedMinutes: estimate,
      urgency,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success('요청을 올렸어요. 동료들에게 도움을 요청해보세요!');
      closeCreateModal();
    } else {
      toast.error(res.error);
    }
  };

  /* 자주 쓰는 태그 추천 */
  const suggestTags = allTags.slice(0, 8).filter((t) => !tags.includes(t));

  return (
    <Modal isOpen={createModalOpen} onClose={closeCreateModal} size="md" title="도움 요청 올리기">
      <div className="ask-form">
        <label className="ask-label">
          제목 <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) React 컴포넌트 리렌더 이슈 봐주실 분, 엑셀 VLOOKUP 함수 도와주세요"
          className="ask-input"
          maxLength={100}
        />

        <label className="ask-label">상세 내용</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="구체적으로 어떤 도움이 필요한가요? 상황과 시도해본 것을 적어주세요."
          className="ask-textarea"
        />

        <label className="ask-label">태그</label>
        <div className="ask-tag-input-row">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
              if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            placeholder="React, 엑셀, 디자인 등 (Enter로 추가)"
            className="ask-input"
          />
          <button type="button" className="ask-tag-add-btn" onClick={() => addTag()}>
            <i className="fa-solid fa-plus" />
          </button>
        </div>
        {(tags.length > 0 || suggestTags.length > 0) && (
          <div className="ask-tag-list">
            {tags.map((t) => (
              <span key={t} className="ask-tag chosen">
                {t}
                <button type="button" onClick={() => removeTag(t)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </span>
            ))}
            {suggestTags.map((t) => (
              <button
                key={t}
                type="button"
                className="ask-tag suggest"
                onClick={() => addTag(t)}
              >
                + {t}
              </button>
            ))}
          </div>
        )}

        <label className="ask-label">예상 소요 시간</label>
        <div className="ask-estimates">
          {ESTIMATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`ask-estimate-chip ${estimate === p.value ? 'active' : ''}`}
              onClick={() => setEstimate(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="ask-label">긴급도</label>
        <div className="ask-urgency-grid">
          {URGENCY_LEVELS.map((u) => (
            <button
              key={u.value}
              type="button"
              className={`ask-urgency-btn ${urgency === u.value ? 'active' : ''}`}
              style={
                urgency === u.value
                  ? { background: u.color, borderColor: u.color, color: '#fff' }
                  : { color: u.color, borderColor: `${u.color}50` }
              }
              onClick={() => setUrgency(u.value)}
            >
              <i className={`fa-solid ${u.icon}`} />
              {u.label}
            </button>
          ))}
        </div>

        <p className="ask-note">
          <i className="fa-solid fa-circle-info" /> 누군가 잡으면 진행 중으로 바뀌고, 해결 완료하면 도와준 분께 자동으로 칭찬과 +10P가 전달돼요.
        </p>
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeCreateModal} disabled={submitting}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '올리는 중...' : <><i className="fa-solid fa-hand" /> 도움 요청</>}
        </button>
      </div>
    </Modal>
  );
}