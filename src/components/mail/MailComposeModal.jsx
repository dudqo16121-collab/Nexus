// 메일 작성 모달 — 새 메일 / 답장 / 전달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useMail } from '../../contexts/MailContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

export default function MailComposeModal() {
  const { composeModal, closeCompose, sendMail, allUsers } = useMail();
  const { user } = useAuth();
  const toast = useToast();

  const { open, mode, initial } = composeModal;

  const [recipients, setRecipients] = useState([]); // [{id, full_name, ...}]
  const [recipientSearch, setRecipientSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  /* 모드에 따른 초기화 */
  useEffect(() => {
    if (!open) return;

    if (mode === 'reply' && initial) {
      /* 답장 — 발신자만 자동 수신자 */
      const sender = allUsers.find((u) => u.id === initial.sender_id);
      setRecipients(sender ? [sender] : []);
      setSubject(initial.subject?.startsWith('Re: ') ? initial.subject : `Re: ${initial.subject || ''}`);
      setBody(`\n\n\n---\n${initial.sender_id === user?.id ? '' : ''}원본 메일\n${(initial.body || '').split('\n').map((l) => '> ' + l).join('\n')}`);
    } else if (mode === 'forward' && initial) {
      /* 전달 — 수신자 비움 */
      setRecipients([]);
      setSubject(initial.subject?.startsWith('Fwd: ') ? initial.subject : `Fwd: ${initial.subject || ''}`);
      setBody(`\n\n\n---\n전달된 메일\n${(initial.body || '').split('\n').map((l) => '> ' + l).join('\n')}`);
    } else {
      /* 새 메일 */
      setRecipients([]);
      setSubject('');
      setBody('');
    }
    setRecipientSearch('');
  }, [open, mode, initial, allUsers, user]);

  /* 수신자 검색 후보 — 본인 제외, 이미 선택한 사람 제외 */
  const kw = recipientSearch.trim().toLowerCase();
  const candidates = !kw
    ? []
    : allUsers
        .filter((u) => u.id !== user?.id)
        .filter((u) => !recipients.some((r) => r.id === u.id))
        .filter((u) =>
          (u.full_name || '').toLowerCase().includes(kw) ||
          (u.department || '').toLowerCase().includes(kw)
        )
        .slice(0, 6);

  const addRecipient = (u) => {
    setRecipients((prev) => [...prev, u]);
    setRecipientSearch('');
  };
  const removeRecipient = (id) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.warning('받는 사람을 1명 이상 선택해주세요.');
      return;
    }
    setSending(true);
    const res = await sendMail({
      subject,
      body,
      recipientIds: recipients.map((r) => r.id),
      parentId: (mode === 'reply' && initial) ? initial.id : null,
    });
    setSending(false);

    if (res.ok) {
      toast.success('메일이 전송되었습니다.');
      closeCompose();
    } else {
      toast.error(res.error);
    }
  };

  const title = mode === 'reply'   ? '답장'
              : mode === 'forward' ? '전달'
              : '새 메일';

  return (
    <Modal isOpen={open} onClose={closeCompose} size="md" title={title}>
      <div className="mail-compose">
        {/* 수신자 */}
        <label className="mail-compose-label">받는 사람</label>
        <div className="mail-compose-recipients">
          {recipients.map((r) => (
            <span key={r.id} className="mail-recipient-chip">
              <div
                className="mail-recipient-avatar"
                style={{ backgroundImage: `url('${avatarUrl(r)}')` }}
              />
              {r.full_name}
              <button type="button" onClick={() => removeRecipient(r.id)} title="제거">
                <i className="fa-solid fa-xmark" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={recipientSearch}
            onChange={(e) => setRecipientSearch(e.target.value)}
            placeholder={recipients.length === 0 ? '이름 또는 부서로 검색...' : '추가...'}
            className="mail-recipient-input"
          />
        </div>

        {/* 후보 드롭다운 */}
        {candidates.length > 0 && (
          <div className="mail-recipient-dropdown">
            {candidates.map((u) => (
              <button
                key={u.id}
                type="button"
                className="mail-recipient-option"
                onClick={() => addRecipient(u)}
              >
                <div
                  className="mail-recipient-avatar"
                  style={{ backgroundImage: `url('${avatarUrl(u)}')` }}
                />
                <div className="mail-recipient-info">
                  <strong>{u.full_name}</strong>
                  {u.department && <span> · {u.department}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 제목 */}
        <label className="mail-compose-label">제목</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="제목을 입력하세요"
          className="mail-compose-subject"
        />

        {/* 본문 */}
        <label className="mail-compose-label">본문</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="내용을 작성하세요..."
          className="mail-compose-body"
          rows={12}
        />
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeCompose} disabled={sending}>
          취소
        </button>
      &nbsp;
        <button type="button" className="btn btn-in" onClick={handleSend} disabled={sending}>
          {sending ? '전송 중...' : <><i className="fa-solid fa-paper-plane" /> 전송</>}
        </button>
      </div>
    </Modal>
  );
}