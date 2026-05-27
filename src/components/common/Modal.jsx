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
 *   - hideHeader: 기본 헤더 숨김 (커스텀 헤더를 내부에 그릴 때)
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  headerExtra,
  hideHeader = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay open" onClick={handleBackdropClick}>
      <div className={`modal-box ${size}`}>
        {!hideHeader && (
          <div className="modal-header">
            <h2>{title}</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {headerExtra}
              <button className="modal-close" onClick={onClose}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}