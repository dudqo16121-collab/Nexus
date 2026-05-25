// components/pulse/PulseSurveyRespond.jsx
// 설문 응답 모달 — 질문 타입별로 입력 UI 분기.

import { useState } from 'react';
import { usePulse } from '../../contexts/PulseContext';
import { useToast } from '../../contexts/ToastContext';

export default function PulseSurveyRespond({ survey, onClose, onDone }) {
  const { submitResponse } = usePulse();
  const toast = useToast();
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setAnswer = (qid, value) => {
    setAnswers((p) => ({ ...p, [qid]: value }));
  };

  /* 필수 응답 검증 */
  const validate = () => {
    for (const q of survey.questions || []) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        toast.warning(`"${q.label}" 응답이 필요해요`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const res = await submitResponse(survey.id, answers);
    setSubmitting(false);
    if (res.ok) {
      toast.success('익명으로 제출됐어요. 감사합니다 💚');
      onDone?.();
    } else {
      toast.error(res.error || '제출 실패');
    }
  };

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div
        className="ps-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <header className="ps-modal-head">
          <div>
            <h2>{survey.title}</h2>
            {survey.description && <p>{survey.description}</p>}
          </div>
          <button type="button" className="ps-modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="ps-modal-anon-notice">
          <i className="fa-solid fa-shield-halved" />
          익명으로 제출됩니다. 작성자 정보는 저장되지 않아요.
        </div>

        <div className="ps-modal-body">
          {(survey.questions || []).map((q, idx) => (
            <QuestionField
              key={q.id}
              num={idx + 1}
              question={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          ))}
        </div>

        <footer className="ps-modal-foot">
          <button type="button" className="ps-btn-ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="ps-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '제출 중...' : (
              <><i className="fa-solid fa-paper-plane" /> 익명 제출</>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─── 질문 타입별 입력 UI ────────────────────────────────── */
function QuestionField({ num, question, value, onChange }) {
  const { type, label, required } = question;

  return (
    <div className="ps-question">
      <label className="ps-question-label">
        <span className="ps-question-num">Q{num}.</span>
        {label}
        {required && <span className="ps-required">*</span>}
      </label>

      {type === 'scale' && (
        <ScaleInput question={question} value={value} onChange={onChange} />
      )}
      {type === 'choice' && (
        <ChoiceInput question={question} value={value} onChange={onChange} />
      )}
      {type === 'text' && (
        <textarea
          className="ps-textarea"
          rows={3}
          maxLength={1000}
          placeholder="자유롭게 작성해주세요 (본인을 특정할 정보는 피해주세요)"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function ScaleInput({ question, value, onChange }) {
  const min = question.scale_min ?? 1;
  const max = question.scale_max ?? 10;
  const numbers = [];
  for (let i = min; i <= max; i++) numbers.push(i);

  return (
    <div className="ps-scale">
      <div className="ps-scale-labels">
        <span>{question.scale_min_label || min}</span>
        <span>{question.scale_max_label || max}</span>
      </div>
      <div className="ps-scale-buttons">
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            className={`ps-scale-btn ${value === n ? 'selected' : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChoiceInput({ question, value, onChange }) {
  return (
    <div className="ps-choice">
      {(question.options || []).map((opt) => (
        <label
          key={opt}
          className={`ps-choice-item ${value === opt ? 'selected' : ''}`}
        >
          <input
            type="radio"
            name={`q_${question.id}`}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}