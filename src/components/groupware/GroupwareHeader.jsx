import { useState } from 'react';
import { useMessenger } from '../../contexts/MessengerContext';
import { useNotification } from '../../contexts/NotificationContext';
import NotificationModal from './NotificationModal';
import { useToast } from '../../contexts/ToastContext';
import { useSearch } from '../../contexts/SearchContext';
import LayoutControls from './LayoutControls';

export default function GroupwareHeader() {
  const toast = useToast();
  const { unreadCount: msgUnread, open: openMessenger } = useMessenger();
  const { unreadCount: notifUnread } = useNotification();
  const [searchValue, setSearchValue] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { openPalette } = useSearch();


  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      toast.info(`검색 기능은 다음 작업에서 구현될 예정입니다: "${searchValue}"`);
      setSearchValue('');
    }
  };

  return (
    <>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
      }}>
        {/* 통합 검색 */}
<div
  style={{
    background: 'var(--panel-bg)',
    border: '1px solid var(--primary-color)',
    borderRadius: 30,
    padding: '12px 25px',
    display: 'flex',
    alignItems: 'center',
    width: 450,
    maxWidth: '100%',
    boxShadow: '0 8px 25px rgba(67,97,238,0.15)',
    cursor: 'pointer',  // ⭐
  }}
  onClick={openPalette}  // ⭐
>
  <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--primary-color)' }}></i>
  <input
    type="text"
    placeholder="통합 검색: 문서, 업무, 팀원, 파일 검색 (⌘K)"
    readOnly
    onFocus={openPalette}
    style={{
      border: 'none',
      outline: 'none',
      background: 'transparent',
      color: 'var(--text-main)',
      fontSize: '1rem',
      width: '100%',
      marginLeft: 10,
      fontWeight: 500,
      cursor: 'pointer',
    }}
  />
  <kbd
    style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border-color)',
      borderRadius: 4,
      padding: '2px 6px',
      fontSize: '0.7rem',
      fontFamily: 'ui-monospace, monospace',
      color: 'var(--text-muted)',
      fontWeight: 600,
      marginLeft: 8,
    }}
  >⌘K</kbd>
</div>

{/* 우측 — 레이아웃 편집 컨트롤 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LayoutControls />
        </div>
      </header>

      {/* 알림 모달 */}
      <NotificationModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
}