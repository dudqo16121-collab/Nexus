// 메일 목록 — 폴더+검색+필터 탭+일괄선택 지원.

import { useMail } from '../../contexts/MailContext';
import { SkeletonList } from '../common/Skeleton';
import { getCategoryMeta } from '../../config/mailCategories';

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

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

/* 본문에서 첨부 키워드 감지 */
function hasAttachment(body) {
  return /첨부|attach/i.test(body || '');
}

const FILTER_TABS = [
  { id: 'all',      label: '전체',   countKey: 'all'      },
  { id: 'unread',   label: '안 읽음', countKey: 'unread'   },
  { id: 'starred',  label: '별표',   countKey: 'starred'  },
  { id: 'attached', label: '첨부',   countKey: 'attached' },
];

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
    listFilter,
    setListFilter,
    listCounts,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    markSelectedAsRead,
    starSelected,
    trashSelected,
  } = useMail();

  const findUser = (id) => allUsers.find((u) => u.id === id);
  const selectedCount = selectedIds.size;
  const allSelected = visibleMails.length > 0 && selectedCount === visibleMails.length;

  /* 답장 스레드 카운트 — 같은 parent_id 또는 자신이 부모인 메일 수 */
  const threadCountFor = (mail) => {
    const mid = mail.message?.id;
    const pid = mail.message?.parent_id;
    if (!mid && !pid) return 0;
    const groupId = pid || mid;
    /* 단순 구현: visibleMails 안에서만 카운트 */
    return visibleMails.filter((m) => {
      const id = m.message?.id;
      const p = m.message?.parent_id;
      return id === groupId || p === groupId;
    }).length;
  };

  return (
    <section className="mail-list">
      {/* 검색 */}
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

      {/* 필터 탭 */}
      <div className="mail-filter-tabs">
        {FILTER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mail-filter-tab ${listFilter === t.id ? 'active' : ''}`}
            onClick={() => setListFilter(t.id)}
          >
            {t.label}
            <span className="mail-filter-count">{listCounts?.[t.countKey] || 0}</span>
          </button>
        ))}
      </div>

      {/* 일괄 액션 바 — 선택 시만 표시 */}
      {selectedCount > 0 && (
        <div className="mail-bulk-bar">
          <span className="mail-bulk-info">
            <i className="fa-solid fa-check-double" />
            {selectedCount}건 선택
          </span>
          <div className="mail-bulk-actions">
            <button type="button" onClick={markSelectedAsRead} title="읽음">
              <i className="fa-solid fa-envelope-open" /> 읽음
            </button>
            <button type="button" onClick={starSelected} title="별표">
              <i className="fa-solid fa-star" /> 별표
            </button>
            <button type="button" onClick={trashSelected} title="휴지통" className="danger">
              <i className="fa-solid fa-trash" /> 삭제
            </button>
            <button type="button" onClick={clearSelection} title="선택 해제" className="ghost">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
      )}

      {/* 전체 선택 체크박스 — 메일 있을 때만 */}
      {visibleMails.length > 0 && !loading && (
        <div className="mail-list-toolbar">
          <label className="mail-checkbox">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => (allSelected ? clearSelection() : selectAll())}
            />
            <span className="mail-checkbox-box" />
            <span className="mail-toolbar-label">
              {allSelected ? '전체 해제' : '전체 선택'}
            </span>
          </label>
          <span className="mail-toolbar-count">{visibleMails.length}건</span>
        </div>
      )}

      {/* 본문 — 메일 행 */}
      <div className="mail-list-body">
        {loading ? (
          <div style={{ padding: '8px' }}>
            <SkeletonList count={8} />
          </div>
        ) : visibleMails.length === 0 ? (
          <div className="mail-empty">
            <i className="fa-regular fa-envelope-open" />
            <p>
              {search
                ? '검색 결과가 없어요'
                : listFilter !== 'all'
                ? `${FILTER_TABS.find((t) => t.id === listFilter)?.label} 메일이 없어요`
                : '메일이 없어요'}
            </p>
          </div>
        ) : (
          visibleMails.map((m) => {
            const isActive = selectedId === m.id;
            const isUnread = m.kind === 'inbox' && !m.read_at;
            const isChecked = selectedIds.has(m.id);
            const sender = findUser(m.message?.sender_id);
            const senderName = m.kind === 'sent'
              ? (m.recipients?.length
                  ? `→ ${(findUser(m.recipients[0].user_id)?.full_name || '...')}${m.recipients.length > 1 ? ` 외 ${m.recipients.length - 1}명` : ''}`
                  : '→ ...')
              : (sender?.full_name || '알 수 없음');

            const catMeta = getCategoryMeta(m.message?.category || 'general');
            const hasAttach = hasAttachment(m.message?.body);
            const threadCount = threadCountFor(m);

            return (
              <div
                key={m.id}
                className={`mail-row ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''} ${isChecked ? 'checked' : ''}`}
                style={{ '--mail-cat-color': catMeta.color }}
              >
                {/* 좌측 카테고리 색상 바 */}
                <span className="mail-row-cat-bar" />

                {/* 체크박스 */}
                <label
                  className="mail-checkbox mail-row-check"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(m.id)}
                  />
                  <span className="mail-checkbox-box" />
                </label>

                {/* 별표 */}
                {m.kind === 'inbox' && folder !== 'trash' ? (
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
                ) : (
                  <span className="mail-row-spacer" />
                )}

                {/* 발신자 아바타 */}
                <div
                  className="mail-row-avatar"
                  style={{ backgroundImage: `url('${avatarUrl(sender)}')` }}
                />

                {/* 본문 영역 — 클릭 시 메일 선택 */}
                <button
                  type="button"
                  className="mail-row-content"
                  onClick={() => selectMail(m.id)}
                >
                  <div className="mail-row-line1">
                    <span className="mail-row-sender">{senderName}</span>
                    <span className="mail-row-time">{formatTime(m.created_at)}</span>
                  </div>
                  <div className="mail-row-line2">
                    <span className="mail-row-subject">
                      {m.message?.subject || '(제목 없음)'}
                    </span>
                    {m.message?.body && (
                      <span className="mail-row-snippet">
                        {' — '}
                        {String(m.message.body).replace(/\n+/g, ' ').slice(0, 60)}
                      </span>
                    )}
                  </div>

                  {/* 메타 — 카테고리/첨부/스레드 */}
                  <div className="mail-row-meta">
                    <span
                      className="mail-row-cat-chip"
                      style={{ background: `${catMeta.color}1a`, color: catMeta.color }}
                    >
                      <i className={`fa-solid ${catMeta.icon}`} /> {catMeta.label}
                    </span>
                    {hasAttach && (
                      <span className="mail-row-attach" title="첨부 있음">
                        <i className="fa-solid fa-paperclip" />
                      </span>
                    )}
                    {threadCount > 1 && (
                      <span className="mail-row-thread" title={`${threadCount}개 메일`}>
                        <i className="fa-regular fa-comments" /> {threadCount}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}