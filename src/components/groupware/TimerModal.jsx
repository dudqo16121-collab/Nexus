import Modal from '../common/Modal';
import { useTimer, TIMER_MODES } from '../../contexts/TimerContext';

/* SVG 원의 둘레 = 2 * π * r = 2 * π * 85 ≈ 534 */
const CIRCUMFERENCE = 534;

export default function TimerModal({ isOpen, onClose }) {
  const { mode, remaining, running, sessions, logs, toggle, reset, skip, changeMode } = useTimer();

  /* mm:ss 포맷 */
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  /* 진행률 — 남은 시간 / 전체 시간 */
  const totalDuration = TIMER_MODES[mode].duration;
  const progress = (totalDuration - remaining) / totalDuration;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={
        <>
          <i className="fa-solid fa-stopwatch" style={{ color: 'var(--danger)' }}></i>
          집중 모드 타이머
        </>
      }
    >
      {/* 모드 선택 버튼 */}
      <div className="timer-mode-btns">
        {Object.entries(TIMER_MODES).map(([key, m]) => (
          <button
            key={key}
            className={`timer-mode-btn ${mode === key ? 'active' : ''}`}
            onClick={() => changeMode(key)}
          >
            {key === 'focus' && '집중 25분'}
            {key === 'short' && '짧은 휴식 5분'}
            {key === 'long' && '긴 휴식 15분'}
          </button>
        ))}
      </div>

      {/* 원형 진행률 + 시간 표시 */}
      <div className="timer-circle">
        <svg className="timer-svg" width="200" height="200" viewBox="0 0 200 200">
          {/* 배경 원 */}
          <circle className="timer-bg" cx="100" cy="100" r="85" />

          {/* 진행 원 (시간에 따라 차오름) */}
          <circle
            className="timer-progress"
            cx="100"
            cy="100"
            r="85"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ stroke: TIMER_MODES[mode].color }}
          />
        </svg>

        <div className="timer-display">
          <div className="timer-time">{display}</div>
          <div className="timer-label">{TIMER_MODES[mode].label}</div>
        </div>
      </div>

      {/* 세션 표시 (집중 4번 = 한 사이클) */}
      <div className="timer-sessions">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`session-dot ${sessions > i ? 'done' : ''}`}
          ></div>
        ))}
      </div>

      {/* 컨트롤 버튼 */}
      <div className="timer-controls">
        <button className="timer-btn timer-btn-secondary" onClick={reset} title="초기화">
          <i className="fa-solid fa-rotate-left"></i>
        </button>
        <button className="timer-btn timer-btn-primary" onClick={toggle}>
          <i className={`fa-solid ${running ? 'fa-pause' : 'fa-play'}`}></i>
        </button>
        <button className="timer-btn timer-btn-secondary" onClick={skip} title="건너뛰기">
          <i className="fa-solid fa-forward-step"></i>
        </button>
      </div>

      {/* 오늘의 집중 기록 */}
      <div className="timer-log">
        <h5>오늘의 집중 기록</h5>
        {logs.length === 0 ? (
          <div className="timer-log-item" style={{ textAlign: 'center', padding: 10 }}>
            아직 기록이 없습니다.
          </div>
        ) : (
          logs.slice(0, 5).map((log, idx) => (
            <div key={idx} className="timer-log-item">{log}</div>
          ))
        )}
      </div>
    </Modal>
  );
}