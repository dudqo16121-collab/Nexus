// 관리자 - 투표 생성/편집 모달.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { usePoll } from '../../contexts/PollContext';
import { useToast } from '../../contexts/ToastContext';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const EMOJI_SUGGESTIONS = [
  '🍕', '🍔', '🍣', '🥗', '🍜', '🍰',
  '🎬', '🎮', '🎵', '⚽', '🎯', '🏖️',
  '☕', '🍺', '🍷', '🥤',
  '👍', '❤️', '🔥', '✨', '🌟', '💡',
];

export default function AdminPollEditModal({ isOpen, onClose, poll }) {
  const { createPoll, updatePoll } = usePoll();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [multiSelect, setMultiSelect] = useState(false);
  const [status, setStatus] = useState('draft');
  const [options, setOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  /* 초기화 */
  useEffect(() => {
    if (!isOpen) return;
    if (poll) {
      setTitle(poll.title || '');
      setDescription(poll.description || '');
      setMultiSelect(!!poll.multi_select);
      setStatus(poll.status || 'draft');
      setOptions(poll.options || []);
    } else {
      setTitle('');
      setDescription('');
      setMultiSelect(false);
      setStatus('draft');
      setOptions([
        { id: uid(), emoji: '', text: '', desc: '' },
        { id: uid(), emoji: '', text: '', desc: '' },
      ]);
    }
  }, [isOpen, poll]);

  const addOption = () => {
    setOptions((prev) => [...prev, { id: uid(), emoji: '', text: '', desc: '' }]);
  };
  const removeOption = (id) => {
    if (options.length <= 2) {
      toast.warning('최소 2개의 옵션이 필요해요');
      return;
    }
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };
  const updateOption = (id, field, value) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };
  const moveOption = (id, dir) => {
    setOptions((prev) => {
      const idx = prev.findIndex((o) => o.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.warning('투표 제목을 입력해주세요');
      return;
    }
    const validOptions = options
      .map((o) => ({
        ...o,
        emoji: (o.emoji || '').trim(),
        text: (o.text || '').trim(),
        desc: (o.desc || '').trim(),
      }))
      .filter((o) => o.text);
    if (validOptions.length < 2) {
      toast.warning('최소 2개의 옵션을 입력해주세요');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      multi_select: multiSelect,
      status,
      options: validOptions,
    };

    setSaving(true);
    const res = poll
      ? await updatePoll(poll.id, payload)
      : await createPoll(payload);
    setSaving(false);

    if (res.ok) {
      toast.success(poll ? '수정했어요' : '투표를 만들었어요');
      onClose();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={poll ? '투표 편집' : '새 투표 만들기'}
    >
      <div className="poll-edit-form">
        {/* 제목 */}
        <label className="poll-edit-label">투표 제목 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 다음 달 사내 행사로 무엇이 좋을까요?"
          className="poll-edit-input"
        />

        {/* 설명 */}
        <label className="poll-edit-label">설명 (선택)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="투표 배경, 일정 등 부가 정보..."
          className="poll-edit-textarea"
          rows={2}
        />

        {/* 옵션 */}
        <label className="poll-edit-label">
          선택 옵션 *
          <span className="poll-edit-hint">최소 2개</span>
        </label>
        <div className="poll-edit-options">
          {options.map((opt, idx) => (
            <div key={opt.id} className="poll-edit-option-row">
              <span className="poll-edit-option-num">{idx + 1}</span>
              <input
                type="text"
                value={opt.emoji}
                onChange={(e) => updateOption(opt.id, 'emoji', e.target.value)}
                placeholder="😀"
                className="poll-edit-emoji"
                maxLength={4}
              />
              <input
                type="text"
                value={opt.text}
                onChange={(e) => updateOption(opt.id, 'text', e.target.value)}
                placeholder="옵션 텍스트"
                className="poll-edit-text"
              />
              <input
                type="text"
                value={opt.desc}
                onChange={(e) => updateOption(opt.id, 'desc', e.target.value)}
                placeholder="(선택) 부가 설명"
                className="poll-edit-desc"
              />
              <div className="poll-edit-option-actions">
                <button type="button" onClick={() => moveOption(opt.id, -1)} title="위로" disabled={idx === 0}>
                  <i className="fa-solid fa-chevron-up" />
                </button>
                <button type="button" onClick={() => moveOption(opt.id, 1)} title="아래로" disabled={idx === options.length - 1}>
                  <i className="fa-solid fa-chevron-down" />
                </button>
                <button type="button" onClick={() => removeOption(opt.id)} title="삭제" className="danger">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="poll-edit-add-option" onClick={addOption}>
            <i className="fa-solid fa-plus" /> 옵션 추가
          </button>
        </div>

        {/* 이모지 추천 */}
        <div className="poll-edit-emoji-suggest">
          <span className="poll-edit-hint">이모지 추천:</span>
          {EMOJI_SUGGESTIONS.map((e) => (
            <button
              key={e}
              type="button"
              className="poll-edit-emoji-chip"
              onClick={() => {
                /* 비어있는 첫 번째 옵션에 채우기 */
                const empty = options.find((o) => !o.emoji);
                if (empty) updateOption(empty.id, 'emoji', e);
              }}
              title="비어있는 옵션에 추가"
            >
              {e}
            </button>
          ))}
        </div>

        {/* 설정 */}
        <label className="poll-edit-label">투표 설정</label>
        <div className="poll-edit-settings">
          <label className="poll-edit-toggle">
            <input
              type="checkbox"
              checked={multiSelect}
              onChange={(e) => setMultiSelect(e.target.checked)}
            />
            <span>복수 선택 허용 (체크 시 여러 옵션을 동시에 고를 수 있음)</span>
          </label>

          <div className="poll-edit-status-row">
            <span>상태:</span>
            {['draft', 'active', 'closed'].map((s) => (
              <button
                key={s}
                type="button"
                className={`poll-edit-status-btn ${status === s ? 'active' : ''}`}
                onClick={() => setStatus(s)}
              >
                {s === 'draft' ? '임시저장' : s === 'active' ? '진행중' : '종료'}
              </button>
            ))}
          </div>
          {status === 'active' && (
            <p className="poll-edit-hint" style={{ color: '#06d6a0' }}>
              ✓ 저장 즉시 대시보드에 노출됩니다
            </p>
          )}
        </div>
      </div>

<div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={onClose} disabled={saving}>
          취소
        </button>
        &nbsp;
        <button type="button" className="btn btn-in" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : poll ? '수정' : '만들기'}
        </button>
      </div>
    </Modal>
  );
}