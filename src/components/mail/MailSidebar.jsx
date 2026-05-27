// 메일함 좌측 — 폴더 + 카테고리 + 이번주 통계.

import { useMail } from '../../contexts/MailContext';
import { MAIL_CATEGORIES } from '../../config/mailCategories';

const FOLDERS = [
  { id: 'inbox',   label: '받은편지함', icon: 'fa-inbox' },
  { id: 'starred', label: '별표',     icon: 'fa-star' },
  { id: 'sent',    label: '보낸편지함', icon: 'fa-paper-plane' },
  { id: 'trash',   label: '휴지통',    icon: 'fa-trash' },
];

export default function MailSidebar() {
  const {
    folder, setFolder,
    counts, openCompose,
    categoryFilter, setCategoryFilter,
  } = useMail();

  const handleFolderClick = (id) => {
    setFolder(id);
    setCategoryFilter(null); // 폴더 바뀌면 카테고리 필터 해제
  };

  const handleCategoryClick = (catId) => {
    /* 같은 카테고리 다시 클릭 → 해제 */
    setCategoryFilter(categoryFilter === catId ? null : catId);
  };

  return (
    <aside className="mail-sidebar">
      {/* ── 새 메일 작성 ── */}
      <button
        type="button"
        className="mail-compose-btn"
        onClick={() => openCompose('new')}
      >
        <i className="fa-solid fa-pen-to-square" /> 새 메일 작성
      </button>

      {/* ── 폴더 그룹 ── */}
      <div className="mail-side-section">
        <h4 className="mail-side-title">
          <i className="fa-solid fa-folder" /> 메일함
        </h4>
        <div className="mail-folder-list">
          {FOLDERS.map((f) => {
            const isActive = folder === f.id && !categoryFilter;
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
                onClick={() => handleFolderClick(f.id)}
              >
                <span>
                  <i className={`fa-solid ${f.icon}`} /> {f.label}
                </span>
                {count > 0 && (
                  <span className={`mail-folder-count ${f.id === 'inbox' ? 'highlight' : ''}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 카테고리 그룹 ── */}
      <div className="mail-side-section">
        <h4 className="mail-side-title">
          <i className="fa-solid fa-tags" /> 카테고리
        </h4>
        <div className="mail-folder-list">
          {MAIL_CATEGORIES.map((c) => {
            const isActive = categoryFilter === c.id;
            const count = counts.byCategory?.[c.id] || 0;
            return (
              <button
                key={c.id}
                type="button"
                className={`mail-folder-item mail-cat-item ${isActive ? 'active' : ''}`}
                onClick={() => handleCategoryClick(c.id)}
                title={c.desc}
              >
                <span>
                  <i
                    className={`fa-solid ${c.icon} mail-cat-dot`}
                    style={{ color: c.color }}
                  />
                  {c.label}
                </span>
                {count > 0 && (
                  <span className="mail-folder-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 이번주 통계 ── */}
      <div className="mail-side-section mail-side-stats">
        <h4 className="mail-side-title">
          <i className="fa-solid fa-chart-simple" /> 이번주
        </h4>
        <div className="mail-stat-row">
          <span className="mail-stat-label">받은 메일</span>
          <strong className="mail-stat-value">{counts.weekStats?.received || 0}</strong>
        </div>
        <div className="mail-stat-row">
          <span className="mail-stat-label">답장 대기</span>
          <strong
            className="mail-stat-value"
            style={{
              color: (counts.weekStats?.toReply || 0) > 0 ? '#ff9f1c' : 'inherit',
            }}
          >
            {counts.weekStats?.toReply || 0}
          </strong>
        </div>
        <div className="mail-stat-row">
          <span className="mail-stat-label">안 읽음</span>
          <strong
            className="mail-stat-value"
            style={{
              color: (counts.weekStats?.unread || 0) > 0 ? '#f72585' : 'inherit',
            }}
          >
            {counts.weekStats?.unread || 0}
          </strong>
        </div>
      </div>
    </aside>
  );
}