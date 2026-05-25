// contexts/ToastContext.jsx
// 토스트 알림 시스템 — 우하단 스택형.
//
// 사용법:
//   import { useToast } from '../../contexts/ToastContext';
//   const toast = useToast();
//   toast.success('저장되었습니다');
//   toast.error('실패했습니다');
//   toast.warning('확인이 필요합니다');
//   toast.info('새 알림이 있습니다');
//   toast.show({ message, type, duration });  // 고급
//
// Backward compat:
//   기존 `window.showToast(msg, type)` 호출이 코드 베이스에 남아있는 동안
//   이를 받기 위해 Provider 마운트 시 window 에 동일 인터페이스를 노출한다.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const ToastContext = createContext(null);

const ICONS = {
  success: 'fa-circle-check',
  error:   'fa-circle-exclamation',
  warning: 'fa-triangle-exclamation',
  info:    'fa-circle-info',
};

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seqRef = useRef(0);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback(
    ({ message, type = 'info', duration = DEFAULT_DURATION } = {}) => {
      if (!message) return -1;
      const id = ++seqRef.current;
      setToasts((list) => [...list, { id, message, type }]);
      if (duration > 0) {
        const timer = setTimeout(() => remove(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      show,
      success: (message, duration) => show({ message, type: 'success', duration }),
      error:   (message, duration) => show({ message, type: 'error',   duration }),
      warning: (message, duration) => show({ message, type: 'warning', duration }),
      info:    (message, duration) => show({ message, type: 'info',    duration }),
      remove,
    }),
    [show, remove]
  );

  /* Backward compat — window.showToast(msg, type) */
  useEffect(() => {
    const prev = window.showToast;
    window.showToast = (msg, type = 'info') => api.show({ message: msg, type });
    return () => {
      window.showToast = prev;
    };
  }, [api]);

  /* unmount 시 모든 타이머 정리 */
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item toast-${t.type}`}
          onClick={() => onClose(t.id)}
          role="status"
        >
          <i className={`fa-solid ${ICONS[t.type] || ICONS.info}`} />
          <span className="toast-msg">{t.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose(t.id);
            }}
            aria-label="닫기"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}