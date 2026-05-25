// components/common/NoticePopupDisplay.jsx
// 활성 공지를 모달로 표시. App 루트에 한 번만 마운트.

import { useNoticePopup } from '../../contexts/NoticePopupContext';

const PRIORITY_META = {
  info:    { label: '안내',     icon: 'fa-circle-info',          color: '#4361ee' },
  warning: { label: '주의',     icon: 'fa-triangle-exclamation', color: '#f59e0b' },
  urgent:  { label: '긴급',     icon: 'fa-bullhorn',             color: '#ef4444' },
};

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function NoticePopupDisplay() {
  const { currentNotice, dismissCurrent, snoozeToday } = useNoticePopup();

  if (!currentNotice) return null;

  const meta = PRIORITY_META[currentNotice.priority] || PRIORITY_META.info;
  const color = currentNotice.color || meta.color;
  const icon = currentNotice.icon || meta.icon;

  return (
    <div className="notice-popup-overlay" onClick={(e) => e.target === e.currentTarget && dismissCurrent()}>
      <div
        className={`notice-popup notice-popup-${currentNotice.priority}`}
        style={{ '--notice-color': color }}
      >
        {/* 헤더 */}
        <div className="notice-popup-header">
          <div className="notice-popup-icon" style={{ background: `${color}15`, color }}>
            <i className={`fa-solid ${icon}`} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="notice-popup-badge" style={{ background: color }}>
              {meta.label}
            </div>
            <h3 className="notice-popup-title">{currentNotice.title}</h3>
          </div>
          <button
            type="button"
            className="notice-popup-close"
            onClick={dismissCurrent}
            title="닫기"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* 본문 */}
        <div
          className="notice-popup-content"
          dangerouslySetInnerHTML={{ __html: currentNotice.content }}
        />

        {/* 메타 */}
        <div className="notice-popup-meta">
          <i className="fa-solid fa-user" />
          {currentNotice.created_by_name || '관리자'}
          {currentNotice.end_at && (
            <>
              <span className="notice-popup-sep">·</span>
              <span>~ {fmtDate(currentNotice.end_at)} 까지</span>
            </>
          )}
        </div>

        {/* 액션 */}
        <div className="notice-popup-actions">
          <button
            type="button"
            className="notice-popup-snooze"
            onClick={snoozeToday}
          >
            오늘 하루 안 보기
          </button>
          <button
            type="button"
            className="notice-popup-confirm"
            style={{ background: color }}
            onClick={dismissCurrent}
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}