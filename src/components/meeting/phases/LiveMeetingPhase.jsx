// components/meeting/phases/LiveMeetingPhase.jsx
// Live 단계 메인 — 3-패널 레이아웃 + 진행 타이머 + 종료 버튼.

import { useState, useEffect } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import LiveAgendaPanel from '../parts/LiveAgendaPanel';
import LiveNotesEditor from '../parts/LiveNotesEditor';
import DecisionPanel from '../parts/DecisionPanel';

/* 진행 시간 — mm:ss 또는 hh:mm:ss */
function formatElapsed(startIso) {
  if (!startIso) return '00:00';
  const ms = Date.now() - new Date(startIso).getTime();
  if (ms < 0) return '00:00';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function LiveMeetingPhase() {
  const { user } = useAuth();
  const { current, transitionPhase } = useMeetingCanvas();
  const toast = useToast();

  const [elapsed, setElapsed] = useState('00:00');

  /* 1초마다 갱신 */
  useEffect(() => {
    if (!current?.canvas?.started_at) return;
    const update = () => setElapsed(formatElapsed(current.canvas.started_at));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [current?.canvas?.started_at]);

  if (!current) return null;
  const { canvas } = current;
  const isHost = canvas.host_id === user?.id;

  /* 예정 시간 초과 여부 */
  const overTime = (() => {
    if (!canvas.started_at || !canvas.duration_min) return false;
    const elapsedMs = Date.now() - new Date(canvas.started_at).getTime();
    return elapsedMs > canvas.duration_min * 60_000;
  })();

  const handleEnd = async () => {
    if (!confirm('회의를 종료할까요?\n"회의 후" 단계로 전환되며, 회의록을 작성할 수 있어요.')) return;
    const res = await transitionPhase(canvas.id, 'post');
    if (res.ok) toast.success('회의가 종료됐어요. 회의록을 정리해보세요.');
    else toast.error(res.error);
  };

  return (
    <div className="mc-live">
      {/* Live 상태바 */}
      <div className="mc-live-bar">
        <div className="mc-live-indicator">
          <span className="mc-live-dot" />
          LIVE
        </div>
        <div className={`mc-live-timer ${overTime ? 'over' : ''}`}>
          <i className="fa-regular fa-clock" />
          <strong>{elapsed}</strong>
          {canvas.duration_min && (
            <span className="mc-live-timer-target">
              / 예정 {canvas.duration_min}분
            </span>
          )}
        </div>
        {isHost && (
          <button
            type="button"
            className="mc-live-end-btn"
            onClick={handleEnd}
          >
            <i className="fa-solid fa-stop" /> 회의 종료
          </button>
        )}
      </div>

      {/* 3-패널 그리드 */}
      <div className="mc-live-grid">
        <LiveAgendaPanel />
        <LiveNotesEditor />
        <DecisionPanel />
      </div>
    </div>
  );
}