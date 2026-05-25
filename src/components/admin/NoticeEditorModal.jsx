// components/admin/NoticeEditorModal.jsx
// 공지 추가/수정 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useNoticePopup } from '../../contexts/NoticePopupContext';
import { useToast } from '../../contexts/ToastContext';

const PRIORITIES = [
  { value: 'info',    label: '안내',  color: '#4361ee', icon: 'fa-circle-info' },
  { value: 'warning', label: '주의',  color: '#f59e0b', icon: 'fa-triangle-exclamation' },
  { value: 'urgent',  label: '긴급',  color: '#ef4444', icon: 'fa-bullhorn' },
];

const TARGETS = [
  { value: 'all',   label: '전체' },
  { value: 'admin', label: '관리자만' },
  { value: 'user',  label: '일반 사용자만' },
];

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${mi}`;
}

export default function NoticeEditorModal({ isOpen, onClose, notice }) {
  const toast = useToast();
  const { createNotice, updateNotice } = useNoticePopup();

  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'info',
    start_at: '',
    end_at: '',
    target_roles: 'all',
    show_once: true,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const isEdit = !!notice;

  useEffect(() => {
    if (notice) {
      setForm({
        title: notice.title || '',
        content: notice.content || '',
        priority: notice.priority || 'info',
        start_at: toLocalInput(notice.start_at),
        end_at: toLocalInput(notice.end_at),
        target_roles: notice.target_roles || 'all',
        show_once: notice.show_once !== false,
        is_active: notice.is_active !== false,
      });
    } else {
      setForm({
        title: '',
        content: '',
        priority: 'info',
        start_at: '',
        end_at: '',
        target_roles: 'all',
        show_once: true,
        is_active: true,
      });
    }
  }, [notice, isOpen]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('제목을 입력하세요.');
      return;
    }
    if (!form.content.trim()) {
      toast.error('내용을 입력하세요.');
      return;
    }

    setSaving(true);
    const meta = PRIORITIES.find((p) => p.value === form.priority);
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      priority: form.priority,
      icon: meta?.icon || 'fa-bullhorn',
      color: meta?.color || '#4361ee',
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      target_roles: form.target_roles,
      show_once: form.show_once,
      is_active: form.is_active,
    };

    const res = isEdit
      ? await updateNotice(notice.id, payload)
      : await createNotice(payload);
    setSaving(false);

    if (res.ok) {
      toast.success(isEdit ? '공지가 수정되었어요.' : '공지가 등록되었어요.');
      onClose();
    } else {
      toast.error(res.error || '저장 실패');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={isEdit ? '공지 수정' : '새 공지 작성'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 우선순위 — 픽 */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            우선순위
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set('priority', p.value)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: `2px solid ${form.priority === p.value ? p.color : 'var(--border-color)'}`,
                  background: form.priority === p.value ? `${p.color}15` : 'var(--bg-2)',
                  color: form.priority === p.value ? p.color : 'var(--text-muted)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <i className={`fa-solid ${p.icon}`} /> {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            제목 *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="예: 시스템 점검 안내"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              background: 'var(--bg-2)',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
              fontSize: '0.92rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 내용 */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            내용 * <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(HTML 가능 — &lt;b&gt;, &lt;br&gt;, &lt;a&gt; 등)</span>
          </label>
          <textarea
            rows={6}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="공지 내용을 입력하세요. HTML 태그 사용 가능."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              background: 'var(--bg-2)',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 표시 기간 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              시작 시각
            </label>
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => set('start_at', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                background: 'var(--bg-2)',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              종료 시각 (비우면 무기한)
            </label>
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => set('end_at', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                background: 'var(--bg-2)',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 대상 */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            표시 대상
          </label>
          <select
            value={form.target_roles}
            onChange={(e) => set('target_roles', e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              background: 'var(--bg-2)',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
              fontSize: '0.92rem',
              outline: 'none',
            }}
          >
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* 옵션 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-main)' }}>
            <input
              type="checkbox"
              checked={form.show_once}
              onChange={(e) => set('show_once', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--primary-color)' }}
            />
            한 번 확인하면 다시 보이지 않음 (체크 해제 시 로그인할 때마다 표시)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-main)' }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--primary-color)' }}
            />
            활성 (체크 해제 시 사용자에게 표시되지 않음)
          </label>
        </div>

        {/* 액션 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.88rem',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-in"
            style={{
              flex: 'none',
              width: 'auto',
              padding: '8px 16px',
              fontSize: '0.88rem',
              fontWeight: 600,
              borderRadius: 8,
            }}
          >
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin" /> 저장 중...</>
            ) : isEdit ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </Modal>
  );
}