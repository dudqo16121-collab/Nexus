// 메일함 좌측 — 폴더 목록 + 카운트.

import { useMail } from '../../contexts/MailContext';

const FOLDERS = [
  { id: 'inbox',   label: '받은편지함', icon: 'fa-inbox' },
  { id: 'starred', label: '별표',     icon: 'fa-star' },
  { id: 'sent',    label: '보낸편지함', icon: 'fa-paper-plane' },
  { id: 'trash',   label: '휴지통',    icon: 'fa-trash' },
];

export default function MailSidebar() {
  const { folder, setFolder, counts, openCompose } = useMail();

  return (
    <aside className="mail-sidebar">
      <button
        type="button"
        className="mail-compose-btn"
        onClick={() => openCompose('new')}
      >
        <i className="fa-solid fa-pen-to-square" /> 새 메일
      </button>

      <div className="mail-folder-list">
        {FOLDERS.map((f) => {
          const isActive = folder === f.id;
          let count = 0;
          if (f.id === 'inbox')   count = counts.unread;
          if (f.id === 'starred') count = counts.starred;
          if (f.id === 'sent')    count = counts.sent;
          if (f.id === 'trash')   count = counts.trash;

          return (
            <button
              key={f.id}
              type="button"
              className={`mail-folder-item ${isActive ? 'active' : ''}`}
              onClick={() => setFolder(f.id)}
            >
              <span>
                <i className={`fa-solid ${f.icon}`} /> {f.label}
              </span>
              {count > 0 && (
                <span className={`mail-folder-count ${f.id === 'inbox' && count > 0 ? 'highlight' : ''}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}