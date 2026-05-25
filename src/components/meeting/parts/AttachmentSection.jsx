// components/meeting/parts/AttachmentSection.jsx
// 첨부 자료 — 외부 URL, Wiki 링크 등.

import { useState } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import {
  ATTACHMENT_KINDS, getAttachmentKindMeta,
} from '../../../config/meetingCanvasConfig';

export default function AttachmentSection() {
  const { user } = useAuth();
  const { current, addAttachment, removeAttachment } = useMeetingCanvas();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState('external_url');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  if (!current) return null;
  const { canvas, attendees, attachments } = current;
  const canEdit = canvas.host_id === user?.id || attendees.some((a) => a.user_id === user?.id);

  const handleAdd = async () => {
    if (!url.trim()) {
      toast.warning('링크 또는 경로를 입력해주세요');
      return;
    }
    const res = await addAttachment(canvas.id, {
      kind,
      title: title.trim() || url.trim(),
      url: url.trim(),
    });
    if (res.ok) {
      setUrl('');
      setTitle('');
      setAdding(false);
    } else {
      toast.error(res.error);
    }
  };

  const handleRemove = async (att) => {
    if (!confirm('첨부를 제거할까요?')) return;
    const res = await removeAttachment(att.id);
    if (!res.ok) toast.error(res.error);
  };

  return (
    <section className="mc-section">
      <div className="mc-section-head">
        <h3>
          <i className="fa-solid fa-paperclip" style={{ color: '#06d6a0' }} />
          첨부 자료 ({attachments.length})
        </h3>
      </div>

      {attachments.length === 0 && !adding && (
        <div className="mc-empty-hint">
          <i className="fa-regular fa-folder-open" />
          <p>관련 위키 문서, 자료 링크를 미리 공유해두세요</p>
        </div>
      )}

      <ul className="mc-attachment-list">
      {attachments.map((att) => {
          const meta = getAttachmentKindMeta(att.kind);
          return (
            <li key={att.id} className="mc-attachment-item">
              <i className={`fa-solid ${meta.icon} mc-attachment-icon`} />
              <a
                href={att.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mc-attachment-link"
                onClick={(e) => { if (!att.url) e.preventDefault(); }}
              >
                {att.title || att.url || '(제목 없음)'}
              </a>
              <span className="mc-attachment-kind">{meta.label}</span>
              {canEdit && (
                <button
                  type="button"
                  className="mc-icon-btn mc-icon-danger"
                  onClick={() => handleRemove(att)}
                  title="제거"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div className="mc-attachment-add-form">
          <select
            className="mc-input"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {ATTACHMENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <input
            type="text"
            className="mc-input"
            placeholder="제목 (선택)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            className="mc-input"
            placeholder="URL 또는 경로"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="mc-btn-sm primary" onClick={handleAdd}>
              추가
            </button>
            <button type="button" className="mc-btn-sm" onClick={() => {
              setAdding(false); setUrl(''); setTitle('');
            }}>취소</button>
          </div>
        </div>
      ) : canEdit ? (
        <button type="button" className="mc-add-btn" onClick={() => setAdding(true)}>
          <i className="fa-solid fa-plus" /> 자료 추가
        </button>
      ) : null}
    </section>
  );
}