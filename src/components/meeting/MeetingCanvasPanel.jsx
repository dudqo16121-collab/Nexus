// components/meeting/MeetingCanvasPanel.jsx
// 회의 캔버스 메인 패널 — 단계에 따라 다른 화면 렌더.

import { useMeetingCanvas } from '../../contexts/MeetingCanvasContext';
import MeetingHeader from './MeetingHeader';
import PreMeetingPhase from './phases/PreMeetingPhase';
import LiveMeetingPhase from './phases/LiveMeetingPhase';
import PostMeetingPhase from './phases/PostMeetingPhase';
import ArchivedMeetingPhase from './phases/ArchivedMeetingPhase';

export default function MeetingCanvasPanel() {
  const { current, currentLoading } = useMeetingCanvas();

  if (currentLoading) {
    return (
      <div className="mc-panel-loading">
        <i className="fa-solid fa-spinner fa-spin" /> 회의를 불러오는 중...
      </div>
    );
  }

  if (!current?.canvas) return null;
  const { canvas } = current;

  return (
    <article className="mc-panel">
      <MeetingHeader />

      {canvas.phase === 'pre' && <PreMeetingPhase />}

      {canvas.phase === 'live' && <LiveMeetingPhase />}

      {canvas.phase === 'post' && <PostMeetingPhase />}

      {canvas.phase === 'archived' && <ArchivedMeetingPhase />}
    </article>
  );
}