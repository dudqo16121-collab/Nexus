// components/feedback/FeedbackWriteCard.jsx
// 익명 피드백 작성 — 3-step 카드 (WellbeingCheckin 패턴 차용).

import { useState } from 'react';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useToast } from '../../contexts/ToastContext';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_SENTIMENTS,
  FEEDBACK_SCOPES,
  MIN_BODY_LENGTH,
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
} from '../../config/feedbackTypes';
import AnonymityNotice from './AnonymityNotice';

export default function FeedbackWriteCard({ onSubmitted }) {
  const { createFeedback } = useFeedback();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: null,
    sentiment: 'suggestion',
    target_scope: 'company',
    target_label: '',
    title: '',
    body: '',
    includeDept: true,
    includeTenure: true,
  });

  const patch = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  /* Step 0 — 카테고리 선택 */
  const handlePickCategory = (cat) => {
    setForm((p) => ({ ...p, category: cat.value }));
    setTimeout(() => setStep(1), 200);
  };

  /* 최종 제출 */
  const handleSubmit = async () => {
    if (form.title.trim().length < MIN_TITLE_LENGTH) {
      toast.warning(`제목은 ${MIN_TITLE_LENGTH}자 이상이어야 해요.`);
      return;
    }
    if (form.body.trim().length < MIN_BODY_LENGTH) {
      toast.warning(`본문은 ${MIN_BODY_LENGTH}자 이상이어야 해요.`);
      return;
    }

    setSubmitting(true);
    const res = await createFeedback(form);
    setSubmitting(false);

    if (res.ok) {
      toast.success('익명으로 제출됐어요. 응답이 달리면 알려드릴게요 💚');
      setDone(true);
    } else {
      toast.error(res.error || '제출 실패');
    }
  };

  const handleReset = () => {
    setDone(false);
    setStep(0);
    setForm({
      category: null,
      sentiment: 'suggestion',
      target_scope: 'company',
      target_label: '',
      title: '',
      body: '',
      includeDept: true,
      includeTenure: true,
    });
  };

  /* === 완료 화면 === */
  if (done) {
    return (
      <div className="fb-done">
        <div className="fb-done-icon">🎉</div>
        <h2>익명으로 제출됐어요</h2>
        <p>
          이 브라우저에 본인 인증 토큰이 저장되어 있어요. <br />
          이 글은 "내 글" 탭에서 다시 확인하거나 수정/삭제할 수 있습니다.
        </p>
        <button type="button" className="fb-btn-primary" onClick={handleReset}>
          <i className="fa-solid fa-pen" /> 다른 피드백도 작성하기
        </button>
        {onSubmitted && (
          <button type="button" className="fb-btn-ghost" onClick={onSubmitted}>
            목록 보기
          </button>
        )}
      </div>
    );
  }

  /* === 진행 인디케이터 === */
  const Indicator = () => (
    <div className="fb-stepper">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`fb-stepper-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
        >
          {i < step ? <i className="fa-solid fa-check" /> : i + 1}
        </div>
      ))}
    </div>
  );

  /* === Step 0: 카테고리 === */
  if (step === 0) {
    return (
      <div className="fb-write-card">
        <AnonymityNotice />
        <Indicator />
        <h2 className="fb-step-title">어떤 주제의 피드백인가요?</h2>
        <p className="fb-step-sub">가장 가까운 분류를 선택해주세요</p>

        <div className="fb-cat-grid">
          {FEEDBACK_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`fb-cat-btn ${form.category === c.value ? 'selected' : ''}`}
              style={form.category === c.value ? { borderColor: c.color, background: `${c.color}18` } : {}}
              onClick={() => handlePickCategory(c)}
            >
              <div className="fb-cat-em">{c.emoji}</div>
              <div className="fb-cat-label">{c.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* === Step 1: 제목 + 본문 + 감정 === */
  if (step === 1) {
    const titleLeft = MAX_TITLE_LENGTH - form.title.length;
    const bodyLeft = MAX_BODY_LENGTH - form.body.length;
    return (
      <div className="fb-write-card">
        <Indicator />
        <h2 className="fb-step-title">어떤 이야기를 나누고 싶나요?</h2>
        <p className="fb-step-sub">구체적이고 건설적인 의견일수록 더 좋은 변화를 만들어요</p>

        <div className="fb-sentiment-group">
          {FEEDBACK_SENTIMENTS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`fb-sent-btn ${form.sentiment === s.value ? 'selected' : ''}`}
              style={form.sentiment === s.value ? { borderColor: s.color, background: `${s.color}22`, color: s.color } : {}}
              onClick={() => patch('sentiment', s.value)}
            >
              <span>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>

        <label className="fb-field-label">제목 *</label>
        <input
          type="text"
          className="fb-input"
          maxLength={MAX_TITLE_LENGTH}
          placeholder="한 줄로 요약해주세요"
          value={form.title}
          onChange={(e) => patch('title', e.target.value)}
        />
        <div className="fb-field-hint">{titleLeft}자 남음</div>

        <label className="fb-field-label">본문 *</label>
        <textarea
          className="fb-textarea"
          rows={8}
          maxLength={MAX_BODY_LENGTH}
          placeholder={`최소 ${MIN_BODY_LENGTH}자 이상 자세히 적어주세요.\n\n예: 매주 화요일 전사 회의가 2시간이라 업무 집중이 어렵습니다. 1시간으로 줄이거나 격주로 진행하면 좋겠습니다.`}
          value={form.body}
          onChange={(e) => patch('body', e.target.value)}
        />
        <div className="fb-field-hint">
          {form.body.length < MIN_BODY_LENGTH
            ? <span style={{ color: 'var(--warning)' }}>최소 {MIN_BODY_LENGTH}자 (현재 {form.body.length}자)</span>
            : <span>{bodyLeft}자 남음</span>}
        </div>

        <div className="fb-step-nav">
          <button type="button" className="fb-btn-ghost" onClick={() => setStep(0)}>
            <i className="fa-solid fa-arrow-left" /> 뒤로
          </button>
          <button
            type="button"
            className="fb-btn-primary"
            onClick={() => setStep(2)}
            disabled={
              form.title.trim().length < MIN_TITLE_LENGTH ||
              form.body.trim().length < MIN_BODY_LENGTH
            }
          >
            다음 <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>
    );
  }

  /* === Step 2: 대상 + 메타 옵션 === */
  return (
    <div className="fb-write-card">
      <Indicator />
      <h2 className="fb-step-title">마지막으로 확인할게요</h2>
      <p className="fb-step-sub">대상 범위와 함께 표시할 정보를 선택하세요</p>

      <label className="fb-field-label">피드백 대상</label>
      <div className="fb-scope-group">
        {FEEDBACK_SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`fb-scope-btn ${form.target_scope === s.value ? 'selected' : ''}`}
            onClick={() => patch('target_scope', s.value)}
          >
            <i className={`fa-solid ${s.icon}`} /> {s.label}
          </button>
        ))}
      </div>

      {form.target_scope !== 'company' && (
        <>
          <label className="fb-field-label">
            대상 이름 <span className="fb-field-hint-inline">(예: 엔지니어링팀, 대표)</span>
          </label>
          <input
            type="text"
            className="fb-input"
            placeholder="구체적 대상 (선택)"
            value={form.target_label}
            onChange={(e) => patch('target_label', e.target.value)}
          />
        </>
      )}

      <div className="fb-meta-options">
        <h4 className="fb-meta-title">
          <i className="fa-solid fa-eye-slash" /> 함께 표시할 정보 (선택)
        </h4>
        <p className="fb-meta-desc">
          큰 단위로만 표시되며, 끄셔도 작성에 문제없어요.
        </p>

        <label className="fb-checkbox">
          <input
            type="checkbox"
            checked={form.includeDept}
            onChange={(e) => patch('includeDept', e.target.checked)}
          />
          <span>부서 그룹 표시 (예: 엔지니어링 / 디자인)</span>
        </label>

        <label className="fb-checkbox">
          <input
            type="checkbox"
            checked={form.includeTenure}
            onChange={(e) => patch('includeTenure', e.target.checked)}
          />
          <span>연차 그룹 표시 (예: 1-3년)</span>
        </label>
      </div>

      <div className="fb-preview">
        <h4>📋 미리보기</h4>
        <div className="fb-preview-body">
          <strong>{form.title}</strong>
          <p>{form.body}</p>
          <div className="fb-preview-meta">
            {form.includeDept && '부서 그룹'} · {form.includeTenure && '연차 그룹'} · 이번 주
          </div>
        </div>
      </div>

      <div className="fb-step-nav">
        <button type="button" className="fb-btn-ghost" onClick={() => setStep(1)}>
          <i className="fa-solid fa-arrow-left" /> 뒤로
        </button>
        <button
          type="button"
          className="fb-btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <><i className="fa-solid fa-spinner fa-spin" /> 제출 중...</>
          ) : (
            <><i className="fa-solid fa-paper-plane" /> 익명으로 제출</>
          )}
        </button>
      </div>
    </div>
  );
}