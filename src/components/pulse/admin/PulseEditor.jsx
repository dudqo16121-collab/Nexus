// components/pulse/admin/PulseEditor.jsx
// 설문 생성/편집 모달.

import { useState } from 'react';
import { usePulse } from '../../../contexts/PulseContext';
import { useToast } from '../../../contexts/ToastContext';
import {
  QUESTION_TYPES, SCALE_PRESETS, SURVEY_TEMPLATES, makeQuestion,
} from '../../../config/pulseTypes';

export default function PulseEditor({ initial, onClose, onDone }) {
  const { createSurvey, updateSurvey } = usePulse();
  const toast = useToast();
  const isEdit = Boolean(initial?.id);

  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [questions, setQuestions] = useState(initial?.questions || []);
  const [endDays, setEndDays] = useState(7); // 며칠 동안 진행할지
  const [saving, setSaving] = useState(false);

  /* ─── 템플릿 선택 ─────────────────────────────── */
  const applyTemplate = (tpl) => {
    if (questions.length > 0 && !confirm('현재 질문을 모두 대체할까요?')) return;
    setTitle(tpl.title);
    setDescription(tpl.description);
    setQuestions(tpl.questions);
  };

  /* ─── 질문 조작 ─────────────────────────────── */
  const addQuestion = (type) => {
    setQuestions((p) => [...p, makeQuestion(type)]);
  };
  const updateQuestion = (idx, patch) => {
    setQuestions((p) => p.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };
  const removeQuestion = (idx) => {
    setQuestions((p) => p.filter((_, i) => i !== idx));
  };
  const moveQuestion = (idx, dir) => {
    const next = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setQuestions(next);
  };

  /* ─── 저장 ─────────────────────────────────── */
  const handleSave = async (asDraft) => {
    if (!title.trim()) { toast.warning('제목을 입력해주세요'); return; }
    if (questions.length === 0) { toast.warning('질문을 1개 이상 추가해주세요'); return; }
    // 객관식 옵션 검증
    for (const q of questions) {
      if (q.type === 'choice' && (!q.options || q.options.length < 2)) {
        toast.warning(`"${q.label || '제목 없음'}" 객관식 질문은 선택지가 2개 이상이어야 해요`);
        return;
      }
      if (!q.label.trim()) {
        toast.warning('모든 질문에 제목을 입력해주세요'); return;
      }
    }

    const end_at = new Date(Date.now() + endDays * 86400_000).toISOString();
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      questions,
      status: asDraft ? 'draft' : 'draft',  // 일단 항상 draft 로 만들고, 활성화는 별도 버튼
      end_at,
    };

    setSaving(true);
    const res = isEdit
      ? await updateSurvey(initial.id, payload)
      : await createSurvey(payload);
    setSaving(false);

    if (res.ok) {
      toast.success(isEdit ? '저장됐어요' : '초안으로 저장됐어요. 목록에서 활성화하세요.');
      onDone?.();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div
        className="ps-modal ps-modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <header className="ps-modal-head">
          <h2>{isEdit ? '설문 편집' : '새 펄스 서베이'}</h2>
          <button type="button" className="ps-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="ps-modal-body">
          {/* 템플릿 */}
          {!isEdit && (
            <div className="ps-editor-templates">
              <label className="ps-editor-label">템플릿으로 시작</label>
              <div className="ps-template-grid">
                {SURVEY_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    className="ps-template-btn"
                    onClick={() => applyTemplate(tpl)}
                  >
                    <strong>{tpl.title}</strong>
                    <span>{tpl.questions.length}개 질문</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 기본 정보 */}
          <label className="ps-editor-label">제목 *</label>
          <input
            type="text"
            className="ps-input"
            placeholder="예: 2026년 2분기 펄스 체크"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="ps-editor-label">설명 (선택)</label>
          <textarea
            className="ps-textarea"
            rows={2}
            placeholder="응답자에게 보일 짧은 안내문"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <label className="ps-editor-label">진행 기간</label>
          <div className="ps-editor-row">
            <input
              type="number"
              className="ps-input"
              min={1}
              max={90}
              value={endDays}
              onChange={(e) => setEndDays(Number(e.target.value) || 7)}
              style={{ width: 100 }}
            />
            <span style={{ color: 'var(--text-muted)' }}>일 후 자동 마감</span>
          </div>

          {/* 질문 목록 */}
          <label className="ps-editor-label" style={{ marginTop: 24 }}>
            질문 ({questions.length}개)
          </label>
          <div className="ps-question-editor-list">
            {questions.map((q, idx) => (
              <QuestionEditor
                key={q.id}
                num={idx + 1}
                question={q}
                onUpdate={(p) => updateQuestion(idx, p)}
                onRemove={() => removeQuestion(idx)}
                onMoveUp={() => moveQuestion(idx, -1)}
                onMoveDown={() => moveQuestion(idx, 1)}
                isFirst={idx === 0}
                isLast={idx === questions.length - 1}
              />
            ))}
          </div>

          <div className="ps-add-question-row">
            {QUESTION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className="ps-btn-ghost"
                onClick={() => addQuestion(t.value)}
              >
                <i className={`fa-solid ${t.icon}`} /> {t.label} 추가
              </button>
            ))}
          </div>
        </div>

        <footer className="ps-modal-foot">
          <button type="button" className="ps-btn-ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="ps-btn-primary"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? '저장 중...' : '초안 저장'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─── 질문 편집 컴포넌트 ───────────────────────────── */
function QuestionEditor({ num, question, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const { type, label, required } = question;

  return (
    <div className="ps-q-editor">
      <div className="ps-q-editor-head">
        <span className="ps-q-editor-num">Q{num}</span>
        <span className="ps-q-editor-type">
          {QUESTION_TYPES.find((t) => t.value === type)?.label}
        </span>
        <div className="ps-q-editor-tools">
          <button type="button" onClick={onMoveUp} disabled={isFirst} title="위로">
            <i className="fa-solid fa-arrow-up" />
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast} title="아래로">
            <i className="fa-solid fa-arrow-down" />
          </button>
          <button type="button" onClick={onRemove} title="삭제" className="ps-tool-danger">
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      </div>

      <input
        type="text"
        className="ps-input"
        placeholder="질문 내용"
        value={label}
        onChange={(e) => onUpdate({ label: e.target.value })}
      />

      <label className="ps-checkbox-row">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
        />
        <span>필수 응답</span>
      </label>

      {type === 'scale' && <ScaleEditor question={question} onUpdate={onUpdate} />}
      {type === 'choice' && <ChoiceEditor question={question} onUpdate={onUpdate} />}
      {type === 'text' && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          응답자가 자유롭게 텍스트 입력 (최대 1000자)
        </div>
      )}
    </div>
  );
}

function ScaleEditor({ question, onUpdate }) {
  return (
    <div className="ps-scale-editor">
      <label className="ps-editor-label">척도 라벨 프리셋</label>
      <div className="ps-preset-row">
        {SCALE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="ps-preset-btn"
            onClick={() => onUpdate({
              scale_min_label: p.min_label,
              scale_max_label: p.max_label,
            })}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="ps-editor-row">
        <input
          type="text"
          className="ps-input"
          placeholder="낮은 점수 라벨"
          value={question.scale_min_label || ''}
          onChange={(e) => onUpdate({ scale_min_label: e.target.value })}
        />
        <input
          type="text"
          className="ps-input"
          placeholder="높은 점수 라벨"
          value={question.scale_max_label || ''}
          onChange={(e) => onUpdate({ scale_max_label: e.target.value })}
        />
      </div>
    </div>
  );
}

function ChoiceEditor({ question, onUpdate }) {
  const options = question.options || [];

  const setOption = (i, v) => {
    const next = [...options];
    next[i] = v;
    onUpdate({ options: next });
  };
  const addOption = () => onUpdate({ options: [...options, `선택 ${options.length + 1}`] });
  const removeOption = (i) => onUpdate({ options: options.filter((_, idx) => idx !== i) });

  return (
    <div className="ps-choice-editor">
      <label className="ps-editor-label">선택지</label>
      {options.map((opt, i) => (
        <div key={i} className="ps-option-row">
          <input
            type="text"
            className="ps-input"
            value={opt}
            onChange={(e) => setOption(i, e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeOption(i)}
            className="ps-tool-danger"
            disabled={options.length <= 2}
          >
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      ))}
      <button type="button" className="ps-btn-ghost" onClick={addOption}>
        <i className="fa-solid fa-plus" /> 선택지 추가
      </button>
    </div>
  );
}