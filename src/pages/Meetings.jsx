// pages/Meetings.jsx
import { useEffect } from 'react';
import { useMeetingCanvas } from '../contexts/MeetingCanvasContext';
import MeetingsListPage from '../components/meeting/MeetingsListPage';
import MeetingCanvasPanel from '../components/meeting/MeetingCanvasPanel';

export default function Meetings() {
  const { current, currentLoading, clearCurrent } = useMeetingCanvas();

  /* 🔍 디버그 로그 */
  //useEffect(() => {
    //console.log('[Meetings] current:', current);
    //console.log('[Meetings] currentLoading:', currentLoading);
  //}, [current, currentLoading]);

useEffect(() => {
  return () => clearCurrent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);  // ← 빈 deps 로 — 언마운트 시에만 실행

  return (
    <section id="view-meetings" className="mc-page">
      {current ? (
        <>
          <button
            type="button"
            className="mc-back-btn"
            onClick={clearCurrent}
          >
            <i className="fa-solid fa-arrow-left" /> 목록으로
          </button>
          <MeetingCanvasPanel />
        </>
      ) : (
        <MeetingsListPage />
      )}
    </section>
  );
}