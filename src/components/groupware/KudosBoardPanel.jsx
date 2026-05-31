// components/groupware/KudosBoardPanel.jsx
// KudosBoard를 슬라이드 패널로 래핑한 버전.

import { useEffect } from 'react';
import KudosBoard from './KudosBoard';

export default function KudosBoardPanel({ isOpen, onClose }) {
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
        aria-label="칭찬 보드"
      >
        <header className="acp-header">
          <h3 className="acp-title">
            <i className="fa-solid fa-heart" style={{ color: '#f72585' }} />
            칭찬 보드
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
          <KudosBoard />
        </div>
      </aside>
    </>
  );
}