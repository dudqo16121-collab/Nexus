// components/meeting/phases/PostMeetingPhase.jsx
// 회의 후 단계 — 회의록 정리 + 결정/액션 정돈 + 변환 + 발송.

import { useState } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import PostSummarySection from '../parts/PostSummarySection';
import PostDecisionsSummary from '../parts/PostDecisionsSummary';
import SendRecapModal from '../parts/SendRecapModal';

function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return null;
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

export default function PostMeetingPhase() {
  const { user } = useAuth();
  const { current, transitionPhase } = useMeetingCanvas();
  const toast = useToast();
  const [recapOpen, setRecapOpen] = useState(false);

  if (!current) return null;
  const { canvas, attendees, decisions, agendaItems } = current;
  const isHost = canvas.host_id === user?.id;

  const duration = fmtDuration(canvas.started_at, canvas.ended_at);

  /* 통계 */
  const stats = {
    attendees: attendees.filter((a) => a.status === 'accepted' || a.status === 'attended').length,
    agendaDone: agendaItems.filter((a) => a.status === 'done').length,
    agendaTotal: agendaItems.length,
    decisions: decisions.filter((d) => d.type === 'decision').length,
    actions: decisions.filter((d) => d.type === 'action').length,
    converted: decisions.filter((d) => d.type === 'action' && d.task_id).length,
  };

  const handleArchive = async () => {
    if (!confirm('이 회의를 보관할까요?\n보관된 회의는 별도 탭에서 확인할 수 있어요.')) return;
    const res = await transitionPhase(canvas.id, 'archived');
    if (res.ok) toast.success('보관되었습니다');
    else toast.error(res.error);
  };

  const handleBackToLive = async () => {
    if (!confirm('회의 중 단계로 되돌릴까요?')) return;
    const res = await transitionPhase(canvas.id, 'live');
    if (res.ok) toast.success('회의 중 단계로 돌아갔어요');
    else toast.error(res.error);
  };

  return (
    <div className="mc-post">
      {/* 회의 완료 배너 */}
      <div className="mc-post-banner">
        <div className="mc-post-banner-icon">
          <i className="fa-solid fa-circle-check" />
        </div>
        <div className="mc-post-banner-body">
          <h2>회의가 종료되었어요</h2>
          <p>
            {duration && <>진행 시간 <strong>{duration}</strong> · </>}
            결정 <strong>{stats.decisions}</strong>건 · 액션 <strong>{stats.actions}</strong>건
            {stats.converted > 0 && <> · 칸반 변환 <strong>{stats.converted}</strong>건</>}
          </p>
        </div>
        {isHost && (
          <div className="mc-post-banner-actions">
            <button
              type="button"
              className="mc-btn-sm"
              onClick={handleBackToLive}
              title="회의 중 단계로 돌아가기"
            >
              <i className="fa-solid fa-arrow-left" /> 회의 중으로
            </button>
          </div>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="mc-post-stats">
        <div className="mc-post-stat">
          <strong>{stats.attendees}</strong>
          <span>참석</span>
        </div>
        <div className="mc-post-stat">
          <strong>{stats.agendaDone}/{stats.agendaTotal}</strong>
          <span>안건 완료</span>
        </div>
        <div className="mc-post-stat">
          <strong>{stats.decisions}</strong>
          <span>결정사항</span>
        </div>
        <div className="mc-post-stat" style={{ borderLeft: '3px solid #ec4899' }}>
          <strong>{stats.actions}</strong>
          <span>액션 아이템</span>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mc-post-grid">
        <div className="mc-post-left">
          <PostSummarySection />
        </div>
        <div className="mc-post-right">
          <PostDecisionsSummary />
        </div>
      </div>

      {/* 하단 액션 */}
      <div className="mc-post-bottom-actions">
        {isHost && attendees.length > 1 && (
          <button
            type="button"
            className="mc-btn-primary"
            onClick={() => setRecapOpen(true)}
          >
            <i className="fa-solid fa-paper-plane" /> 참석자에게 회의록 발송
          </button>
        )}
        {isHost && (
          <button
            type="button"
            className="mc-btn-sm"
            onClick={handleArchive}
          >
            <i className="fa-solid fa-box-archive" /> 보관하기
          </button>
        )}
      </div>

      <SendRecapModal isOpen={recapOpen} onClose={() => setRecapOpen(false)} />
    </div>
  );
}