import { useEffect } from 'react';

/**
 * 공통 모달 컴포넌트
 * 
 * Props:
 *   - isOpen: 모달 표시 여부
 *   - onClose: 닫기 핸들러
 *   - title: 모달 제목 (또는 React 노드)
 *   - children: 모달 내용
 *   - size: 'sm' | 'md' | 'lg' (default: 'lg')
 *   - headerExtra: 헤더 우측에 추가할 버튼 등 (선택)
 */
export default function Modal({ isOpen, onClose, title, children, size = 'lg', headerExtra }) {
  /* ESC 키로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* 모달 열렸을 때 body 스크롤 잠그기 */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /* 백드롭 클릭 시 닫기 (모달 내부 클릭은 무시) */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay open" onClick={handleBackdropClick}>
      <div className={`modal-box ${size}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {headerExtra}
            <button className="modal-close" onClick={onClose}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}