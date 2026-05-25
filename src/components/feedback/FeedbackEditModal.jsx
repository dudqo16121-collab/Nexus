// components/feedback/FeedbackEditModal.jsx
// 본인 글 수정 모달 — fb_update_with_token RPC 사용.
//
// 작성 화면(FeedbackWriteCard)과 다르게 단일 폼으로 깔끔하게.
// 카테고리/감정/대상/제목/본문 수정 가능.
// 부서·연차 메타와 created_week 는 작성 시점 그대로 유지 (수정 불가).

import { useState, useEffect } from 'react';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useToast } from '../../contexts/ToastContext';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_SENTIMENTS,
  FEEDBACK_SCOPES,
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_BODY_LENGTH,
  MAX_BODY_LENGTH,
} from '../../config/feedbackTypes';

export default function FeedbackEditModal({ feedback, onClose, onDone }) {
  const { updateFeedback } = useFeedback();
  const toast = useToast();

  const [form, setForm] = useState({
    category: feedback.category,
    sentiment: feedback.sentiment,
    target_scope: feedback.target_scope,
    target_label: feedback.target_label || '',
    title: feedback.title,
    body: feedback.body,
  });
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  /* 변경 감지 — 닫을 때 경고용 */
  useEffect(() => {
    const changed =
      form.category !== feedback.category ||
      form.sentiment !== feedback.sentiment ||
      form.target_scope !== feedback.target_scope ||
      (form.target_label || '') !== (feedback.target_label || '') ||
      form.title !== feedback.title ||
      form.body !== feedback.body;
    setDirty(changed);
  }, [form, feedback]);

  const patch = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleClose = () => {
    if (dirty && !confirm('변경사항이 저장되지 않았어요. 닫을까요?')) return;
    onClose();
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const body = form.body.trim();

    if (title.length < MIN_TITLE_LENGTH) {
      toast.warning(`제목은 ${MIN_TITLE_LENGTH}자 이상이어야 해요`);
      return;
    }
    if (title.length > MAX_TITLE_LENGTH) {
      toast.warning(`제목은 ${MAX_TITLE_LENGTH}자 이하여야 해요`);
      return;
    }
    if (body.length < MIN_BODY_LENGTH) {
      toast.warning(`본문은 ${MIN_BODY_LENGTH}자 이상이어야 해요`);
      return;
    }
    if (body.length > MAX_BODY_LENGTH) {
      toast.warning(`본문은 ${MAX_BODY_LENGTH}자 이하여야 해요`);
      return;
    }

    setSubmitting(true);
    const res = await updateFeedback(feedback.id, {
      ...form,
      title,
      body,
    });
    setSubmitting(false);

    if (res.ok) {
      toast.success('수정됐어요');
      onDone?.();
    } else {
      toast.error(res.error || '수정 실패');
    }
  };

  const titleLeft = MAX_TITLE_LENGTH - form.title.length;
  const bodyLeft = MAX_BODY_LENGTH - form.body.length;

  return (
    <div className="fb-edit-backdrop" onClick={handleClose}>
      <div
        className="fb-edit-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="피드백 수정"
      >
        <header className="fb-edit-head">
          <div>
            <h2>
              <i className="fa-solid fa-pen" /> 내 피드백 수정
            </h2>
            <p>본인 인증 토큰이 확인되었어요. 익명성은 그대로 유지됩니다.</p>
          </div>
          <button
            type="button"
            className="fb-edit-close"
            onClick={handleClose}
            aria-label="닫기"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="fb-edit-body">
          {/* 카테고리 */}
          <label className="fb-field-label">카테고리</label>
          <div className="fb-edit-cat-grid">
            {FEEDBACK_CATEGORIES.map((c) => {
              const selected = form.category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`fb-edit-cat-btn ${selected ? 'selected' : ''}`}
                  style={selected
                    ? { borderColor: c.color, background: `${c.color}18`, color: c.color }
                    : {}}
                  onClick={() => patch('category', c.value)}
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              );
            })}
          </div>

          {/* 감정 */}
          <label className="fb-field-label">감정</label>
          <div className="fb-sentiment-group">
            {FEEDBACK_SENTIMENTS.map((s) => {
              const selected = form.sentiment === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  className={`fb-sent-btn ${selected ? 'selected' : ''}`}
                  style={selected
                    ? { borderColor: s.color, background: `${s.color}22`, color: s.color }
                    : {}}
                  onClick={() => patch('sentiment', s.value)}
                >
                  <span>{s.emoji}</span> {s.label}
                </button>
              );
            })}
          </div>

          {/* 대상 범위 */}
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
                대상 이름 <span className="fb-field-hint-inline">(선택)</span>
              </label>
              <input
                type="text"
                className="fb-input"
                placeholder="예: 엔지니어링팀, 대표"
                value={form.target_label}
                onChange={(e) => patch('target_label', e.target.value)}
              />
            </>
          )}

          {/* 제목 */}
          <label className="fb-field-label">제목 *</label>
          <input
            type="text"
            className="fb-input"
            maxLength={MAX_TITLE_LENGTH}
            value={form.title}
            onChange={(e) => patch('title', e.target.value)}
          />
          <div className="fb-field-hint">{titleLeft}자 남음</div>

          {/* 본문 */}
          <label className="fb-field-label">본문 *</label>
          <textarea
            className="fb-textarea"
            rows={8}
            maxLength={MAX_BODY_LENGTH}
            value={form.body}
            onChange={(e) => patch('body', e.target.value)}
          />
          <div className="fb-field-hint">
            {form.body.length < MIN_BODY_LENGTH
              ? <span style={{ color: 'var(--warning)' }}>
                  최소 {MIN_BODY_LENGTH}자 (현재 {form.body.length}자)
                </span>
              : <span>{bodyLeft}자 남음</span>}
          </div>

          {/* 안내 */}
          <div className="fb-edit-notice">
            <i className="fa-solid fa-circle-info" />
            <div>
              <strong>수정해도 익명성은 유지됩니다.</strong>
              <p>
                작성 시점의 부서·연차·작성 주차는 변경되지 않아요.
                응답이 달린 글을 크게 바꾸면 응답의 맥락이 흐트러질 수 있어요.
              </p>
            </div>
          </div>
        </div>

        <footer className="fb-edit-foot">
          <button
            type="button"
            className="fb-btn-ghost"
            onClick={handleClose}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="button"
            className="fb-btn-primary"
            onClick={handleSave}
            disabled={submitting || !dirty}
          >
            {submitting
              ? <><i className="fa-solid fa-spinner fa-spin" /> 저장 중...</>
              : <><i className="fa-solid fa-check" /> 저장</>
            }
          </button>
        </footer>
      </div>
    </div>
  );
}