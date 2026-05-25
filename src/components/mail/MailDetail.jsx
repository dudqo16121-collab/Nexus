// 메일 본문 패널 — 선택된 메일 표시 + 답장/삭제 액션.

import { useMail } from '../../contexts/MailContext';
import { useToast } from '../../contexts/ToastContext';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

export default function MailDetail() {
  const {
    selectedMail,
    allUsers,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    openCompose,
    folder,
  } = useMail();
  const toast = useToast();

  if (!selectedMail) {
    return (
      <section className="mail-detail mail-detail-empty">
        <div>
          <i className="fa-regular fa-envelope" />
          <p>왼쪽 목록에서 메일을 선택하세요</p>
        </div>
      </section>
    );
  }

  const findUser = (id) => allUsers.find((u) => u.id === id);
  const m = selectedMail.message;
  const sender = findUser(m?.sender_id);
  const recipients = selectedMail.kind === 'sent'
    ? (selectedMail.recipients || []).map((r) => findUser(r.user_id)).filter(Boolean)
    : null;

  const handleReply = () => {
    if (selectedMail.kind === 'sent') return; // 보낸편지함은 답장 안 함
    openCompose('reply', m);
  };

  const handleForward = () => {
    openCompose('forward', m);
  };

  const handleTrash = async () => {
    if (selectedMail.kind === 'sent') {
      toast.info('보낸편지함의 메일은 삭제할 수 없어요.');
      return;
    }
    const res = await moveToTrash(selectedMail.recipientId);
    if (res.ok) toast.success('휴지통으로 옮겼어요.');
    else toast.error(res.error);
  };

  const handleRestore = async () => {
    const res = await restoreFromTrash(selectedMail.recipientId);
    if (res.ok) toast.success('받은편지함으로 복원했어요.');
    else toast.error(res.error);
  };

  const handlePermDelete = async () => {
    if (!window.confirm('이 메일을 영구 삭제하시겠습니까? 복구할 수 없어요.')) return;
    const res = await permanentDelete(selectedMail.recipientId);
    if (res.ok) toast.success('영구 삭제했어요.');
    else toast.error(res.error);
  };

  return (
    <section className="mail-detail">
      {/* 헤더 */}
      <div className="mail-detail-header">
        <h2 className="mail-detail-subject">{m?.subject || '(제목 없음)'}</h2>

        <div className="mail-detail-actions">
          {selectedMail.kind === 'inbox' && folder !== 'trash' && (
            <>
              <button type="button" className="mail-icon-btn" onClick={handleReply} title="답장">
                <i className="fa-solid fa-reply" />
              </button>
              <button type="button" className="mail-icon-btn" onClick={handleForward} title="전달">
                <i className="fa-solid fa-share" />
              </button>
              <button type="button" className="mail-icon-btn danger" onClick={handleTrash} title="휴지통으로">
                <i className="fa-solid fa-trash" />
              </button>
            </>
          )}
          {folder === 'trash' && (
            <>
              <button type="button" className="mail-icon-btn" onClick={handleRestore} title="복원">
                <i className="fa-solid fa-rotate-left" />
              </button>
              <button type="button" className="mail-icon-btn danger" onClick={handlePermDelete} title="영구 삭제">
                <i className="fa-solid fa-trash-can" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 발신자 / 수신자 */}
      <div className="mail-detail-meta">
        <div className="mail-detail-sender">
          <div
            className="mail-detail-avatar"
            style={{ backgroundImage: `url('${avatarUrl(sender)}')` }}
          />
          <div>
            <div>
              <strong>{sender?.full_name || '알 수 없음'}</strong>
              {sender?.department && (
                <span className="mail-detail-dept"> · {sender.department}</span>
              )}
            </div>
            {selectedMail.kind === 'sent' && recipients && recipients.length > 0 && (
              <div className="mail-detail-recipients">
                받는 사람: {recipients.map((r) => r.full_name).join(', ')}
              </div>
            )}
            {selectedMail.kind === 'inbox' && (
              <div className="mail-detail-recipients">받는 사람: 나</div>
            )}
          </div>
        </div>
        <div className="mail-detail-time">
          {m?.created_at && new Date(m.created_at).toLocaleString('ko-KR')}
        </div>
      </div>

      {/* 본문 */}
      <div className="mail-detail-body">
        {(m?.body || '').split('\n').map((line, i) => (
          <p key={i}>{line || '\u00A0'}</p>
        ))}
      </div>
    </section>
  );
}