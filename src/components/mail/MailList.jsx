// 메일 목록 — 폴더+검색 기준으로 visibleMails 표시.

import { useMail } from '../../contexts/MailContext';
import { SkeletonList } from '../common/Skeleton';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  const sameYear = d.getFullYear() === now.getFullYear();
  if (sameYear) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return d.toLocaleDateString('ko-KR');
}

export default function MailList() {
  const {
    visibleMails,
    selectedId,
    selectMail,
    toggleStar,
    folder,
    allUsers,
    loading,
    search,
    setSearch,
  } = useMail();

  const findUser = (id) => allUsers.find((u) => u.id === id);

  return (
    <section className="mail-list">
      <div className="mail-list-header">
        <div className="mail-search">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="메일 검색..."
          />
          {search && (
            <button
              type="button"
              className="mail-search-clear"
              onClick={() => setSearch('')}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>

      <div className="mail-list-body">
        {loading ? (
          <div style={{ padding: '8px' }}>
            <SkeletonList count={8} />
          </div>
        ) : visibleMails.length === 0 ? (
          <div className="mail-empty">
            <i className="fa-regular fa-envelope-open" />
            <p>{search ? '검색 결과가 없어요' : '메일이 없어요'}</p>
          </div>
        ) : (
          visibleMails.map((m) => {
            const isActive = selectedId === m.id;
            const isUnread = m.kind === 'inbox' && !m.read_at;
            const sender = findUser(m.message?.sender_id);
            const senderName = m.kind === 'sent'
              ? (m.recipients?.length
                  ? `→ ${(findUser(m.recipients[0].user_id)?.full_name || '...')}${m.recipients.length > 1 ? ` 외 ${m.recipients.length - 1}명` : ''}`
                  : '→ ...')
              : (sender?.full_name || '알 수 없음');

            return (
              <button
                key={m.id}
                type="button"
                className={`mail-row ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                onClick={() => selectMail(m.id)}
              >
                {m.kind === 'inbox' && folder !== 'trash' && (
                  <button
                    type="button"
                    className={`mail-star ${m.starred ? 'on' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(m.recipientId);
                    }}
                    title={m.starred ? '별표 해제' : '별표'}
                  >
                    <i className={`fa-${m.starred ? 'solid' : 'regular'} fa-star`} />
                  </button>
                )}

                <div className="mail-row-content">
                  <div className="mail-row-line1">
                    <span className="mail-row-sender">{senderName}</span>
                    <span className="mail-row-time">{formatTime(m.message?.created_at)}</span>
                  </div>
                  <div className="mail-row-line2">
                    <span className="mail-row-subject">{m.message?.subject || '(제목 없음)'}</span>
                    <span className="mail-row-snippet">— {(m.message?.body || '').substring(0, 80)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}