// components/groupware/ActionCenterPanel.jsx
// ActionCenter를 슬라이드 패널로 래핑한 버전.

import { useEffect } from 'react';
import ActionCenter from './ActionCenter';

export default function ActionCenterPanel({ isOpen, onClose }) {
  /* ESC로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`acp-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`acp-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="나의 액션 아이템"
      >
        <header className="acp-header">
          <h3 className="acp-title">
            <i className="fa-solid fa-list-check" style={{ color: 'var(--primary-color)' }} />
            나의 액션 아이템
          </h3>
          <button
            type="button"
            className="acp-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </header>
        <div className="acp-body">
          <ActionCenter />
        </div>
      </aside>
    </>
  );
}