// components/groupware/AskResolveModal.jsx
// 해결 완료 + 자동 Kudos 발송 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useAsk } from '../../contexts/AskContext';
import { KUDOS_TAGS } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

export default function AskResolveModal() {
  const toast = useToast();
  const { resolveModalRequest, closeResolveModal, resolveRequest } = useAsk();

  const open = !!resolveModalRequest;
  const request = resolveModalRequest;

  const [note, setNote] = useState('');
  const [kudosTag, setKudosTag] = useState('thanks');
  const [kudosMessage, setKudosMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setKudosTag('thanks');
    setKudosMessage('');
  }, [open]);

  if (!request) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await resolveRequest(request.id, { note, kudosTag, kudosMessage });
    setSubmitting(false);
    if (res.ok) {
      toast.success(`${request.helper_name} 님에게 칭찬과 +10P가 전달됐어요 💛`);
      closeResolveModal();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeResolveModal} size="md" title="해결 완료 + 칭찬 보내기">
      <div className="ask-form">
        <div className="ask-resolve-summary">
          <div className="ask-resolve-row">
            <span className="ask-resolve-label">요청</span>
            <strong>{request.title}</strong>
          </div>
          <div className="ask-resolve-row">
            <span className="ask-resolve-label">도와준 분</span>
            <strong style={{ color: '#22c55e' }}>
              <i className="fa-solid fa-user-check" /> {request.helper_name || '동료'}
            </strong>
          </div>
        </div>

        <label className="ask-label">해결 메모 (선택)</label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="어떻게 해결됐는지 간단히 적으면 다른 동료에게도 도움이 돼요."
          className="ask-textarea"
        />

        <label className="ask-label">어떤 칭찬을 보낼까요?</label>
        <div className="ask-kudos-tags">
          {KUDOS_TAGS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`ask-kudos-tag ${kudosTag === t.id ? 'active' : ''}`}
              style={
                kudosTag === t.id
                  ? { background: t.color, borderColor: t.color, color: '#fff' }
                  : { color: t.color, borderColor: t.color }
              }
              onClick={() => setKudosTag(t.id)}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        <label className="ask-label">칭찬 메시지 (선택)</label>
        <textarea
          rows={2}
          value={kudosMessage}
          onChange={(e) => setKudosMessage(e.target.value)}
          placeholder={`"${request.title}" 요청을 도와줘서 고마워요!`}
          className="ask-textarea"
        />

        <p className="ask-note">
          <i className="fa-solid fa-circle-info" /> 해결 처리 시 도움 준 분에게 자동으로 칭찬과 +10P가 전달돼요.
        </p>
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeResolveModal} disabled={submitting}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '처리 중...' : <><i className="fa-solid fa-check" /> 해결 완료</>}
        </button>
      </div>
    </Modal>
  );
}