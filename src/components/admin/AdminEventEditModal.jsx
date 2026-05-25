// components/admin/AdminEventEditModal.jsx
// 회사 일정 생성/수정 모달.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useCompanyEvents } from '../../contexts/CompanyEventsContext';
import { useToast } from '../../contexts/ToastContext';
import {
  EVENT_CATEGORIES, getEventCategoryMeta,
} from '../../config/companyEventTypes';

export default function AdminEventEditModal({ isOpen, onClose, event }) {
  const toast = useToast();
  const { createEvent, updateEvent } = useCompanyEvents();
  const isEdit = !!event;

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    category: 'announcement',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (event) {
      setForm({
        title: event.title || '',
        description: event.description || '',
        event_date: event.event_date || '',
        end_date: event.end_date || '',
        category: event.category || 'announcement',
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setForm({
        title: '',
        description: '',
        event_date: today,
        end_date: '',
        category: 'announcement',
      });
    }
  }, [isOpen, event]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }
    if (!form.event_date) {
      toast.warning('날짜를 선택해주세요.');
      return;
    }
    if (form.end_date && form.end_date < form.event_date) {
      toast.warning('종료일은 시작일 이후여야 해요.');
      return;
    }

    setSubmitting(true);
    const res = isEdit
      ? await updateEvent(event.id, form)
      : await createEvent(form);
    setSubmitting(false);

    if (res.ok) {
      toast.success(isEdit ? '수정됐어요' : '일정이 추가됐어요');
      onClose();
    } else {
      toast.error(res.error || '실패');
    }
  };

  const catMeta = getEventCategoryMeta(form.category);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <>
          <i className={`fa-solid ${catMeta.icon}`} style={{ color: catMeta.color }} />
          {isEdit ? '일정 수정' : '새 일정'}
        </>
      }
    >
      <div className="ce-edit-body">
        {/* 카테고리 */}
        <div className="ce-field">
          <label>카테고리</label>
          <div className="ce-cat-grid">
            {EVENT_CATEGORIES.map((c) => {
              const selected = form.category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`ce-cat-btn ${selected ? 'selected' : ''}`}
                  style={selected ? {
                    borderColor: c.color,
                    background: `${c.color}15`,
                    color: c.color,
                  } : {}}
                  onClick={() => set('category', c.value)}
                  title={c.description}
                >
                  <i className={`fa-solid ${c.icon}`} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 제목 */}
        <div className="ce-field">
          <label>제목 *</label>
          <input
            type="text"
            className="form-input"
            placeholder="예: Q2 워크샵 / 창립기념일"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            maxLength={200}
          />
        </div>

        {/* 날짜 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="ce-field" style={{ flex: 1 }}>
            <label>시작일 *</label>
            <input
              type="date"
              className="form-input"
              value={form.event_date}
              onChange={(e) => set('event_date', e.target.value)}
            />
          </div>
          <div className="ce-field" style={{ flex: 1 }}>
            <label>종료일 (선택)</label>
            <input
              type="date"
              className="form-input"
              value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)}
              min={form.event_date}
              placeholder="하루 행사면 비워두세요"
            />
          </div>
        </div>

        {/* 설명 */}
        <div className="ce-field">
          <label>설명 (선택)</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="장소·복장·준비물 등 추가 안내"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* 미리보기 */}
        <div className="ce-preview">
          <span className="ce-preview-label">미리보기</span>
          <div className="ce-preview-card">
            <div className="ce-preview-icon" style={{ background: `${catMeta.color}20`, color: catMeta.color }}>
              <i className={`fa-solid ${catMeta.icon}`} />
            </div>
            <div className="ce-preview-body">
              <strong>{form.title || '제목 없음'}</strong>
              <p>{catMeta.label}{form.description ? ` · ${form.description.slice(0, 30)}${form.description.length > 30 ? '...' : ''}` : ''}</p>
            </div>
            <span className="ce-preview-date">
              {form.event_date
                ? `${new Date(form.event_date).getMonth() + 1}.${new Date(form.event_date).getDate()}`
                : '-'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" className="btn btn-out" onClick={onClose} disabled={submitting}>
            취소
          </button>
          <button
            type="button"
            className="btn btn-in"
            onClick={handleSave}
            disabled={submitting}
            style={{ background: catMeta.color }}
          >
            {submitting ? '저장 중...' : (isEdit ? '수정' : '추가')}
          </button>
        </div>
      </div>
    </Modal>
  );
}