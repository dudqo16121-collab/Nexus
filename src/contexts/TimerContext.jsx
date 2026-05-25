import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './ToastContext';

const TimerContext = createContext(null);

/* 타이머 모드별 설정 */
export const TIMER_MODES = {
  focus: { duration: 25 * 60, label: '집중 시간',  color: 'var(--primary-color)' },
  short: { duration: 5 * 60,  label: '짧은 휴식', color: 'var(--success)' },
  long:  { duration: 15 * 60, label: '긴 휴식',   color: 'var(--warning)' },
};

export function TimerProvider({ children }) {
  const toast = useToast();
  const [mode, setMode] = useState('focus');
  const [remaining, setRemaining] = useState(TIMER_MODES.focus.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);   /* 완료한 집중 세션 수 */
  const [logs, setLogs] = useState([]);

  /* interval ID를 useRef에 보관 — 컴포넌트 리렌더링과 무관하게 유지 */
  const intervalRef = useRef(null);

  /* 타이머 실행 로직 */
  useEffect(() => {
    if (!running) return;

    /* 1초마다 1씩 감소 */
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          /* 0이 되면 종료 처리 */
          clearInterval(intervalRef.current);
          setRunning(false);

          /* 집중 모드 완료 시 세션 증가 + 로그 추가 */
          if (mode === 'focus') {
            setSessions((s) => Math.min(s + 1, 4));
            const now = new Date();
            const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
            setLogs((prev) => [
              `${time} - ${TIMER_MODES.focus.label} 완료`,
              ...prev,
            ].slice(0, 10));   /* 최근 10개만 */
          }

          /* 알림 효과 — 브라우저 알림 (선택) */
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ ${TIMER_MODES[mode].label} 완료!`);
          }

          return TIMER_MODES[mode].duration;   /* 다시 처음으로 */
        }
        return prev - 1;
      });
    }, 1000);

    /* ⭐ Cleanup: 컴포넌트 언마운트 또는 running 변경 시 정리 */
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, mode]);

  /* 시작/일시정지 토글 */
  const toggle = useCallback(() => {
    setRunning((v) => !v);
  }, []);

  /* 초기화 */
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(TIMER_MODES[mode].duration);
  }, [mode]);

  /* 건너뛰기 */
  const skip = useCallback(() => {
    setRunning(false);
    setRemaining(0);
    setTimeout(() => setRemaining(TIMER_MODES[mode].duration), 100);
  }, [mode]);

  /* 모드 변경 */
  const changeMode = useCallback((newMode) => {
    if (running) {
      toast.warning('타이머를 먼저 정지해주세요.');
      return;
    }
    setMode(newMode);
    setRemaining(TIMER_MODES[newMode].duration);
  }, [running]);

  return (
    <TimerContext.Provider
      value={{
        mode,
        remaining,
        running,
        sessions,
        logs,
        toggle,
        reset,
        skip,
        changeMode,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
};