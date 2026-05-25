// components/meeting/MeetingHeader.jsx
// 회의 캔버스 상단 헤더 — 제목, 시간/장소, 단계 표시.

import { useState } from 'react';
import { useMeetingCanvas } from '../../contexts/MeetingCanvasContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { MEETING_PHASES, getPhaseMeta } from '../../config/meetingCanvasConfig';

function fmtDateTime(iso) {
  if (!iso) return '시간 미정';
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: 'short', day: 'numeric', weekday: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function MeetingHeader() {
  const { user } = useAuth();
  const { current, updateCanvas, transitionPhase } = useMeetingCanvas();
  const toast = useToast();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  if (!current?.canvas) return null;
  const { canvas } = current;
  const isHost = canvas.host_id === user?.id;
  const phaseMeta = getPhaseMeta(canvas.phase);

  const handleTitleSave = async () => {
    const t = titleDraft.trim();
    if (!t) {
      setEditingTitle(false);
      return;
    }
    if (t === canvas.title) {
      setEditingTitle(false);
      return;
    }
    const res = await updateCanvas(canvas.id, { title: t });
    if (res.ok) {
      toast.success('제목 수정됨');
    } else {
      toast.error(res.error);
    }
    setEditingTitle(false);
  };

  const handleStartMeeting = async () => {
    if (!confirm('회의를 시작할까요? "회의 중" 단계로 전환됩니다.')) return;
    const res = await transitionPhase(canvas.id, 'live');
    if (res.ok) toast.success('회의가 시작됐어요 🎙️');
    else toast.error(res.error);
  };

  return (
    <header className="mc-header">
      <div className="mc-header-top">
        <div className="mc-title-area">
          {editingTitle ? (
            <input
              autoFocus
              className="mc-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              maxLength={300}
            />
          ) : (
            <h1
              className="mc-title"
              onClick={() => {
                if (!isHost) return;
                setTitleDraft(canvas.title);
                setEditingTitle(true);
              }}
              title={isHost ? '클릭해서 수정' : ''}
              style={{ cursor: isHost ? 'pointer' : 'default' }}
            >
              {canvas.title}
              {isHost && <i className="fa-solid fa-pen mc-title-edit-icon" />}
            </h1>
          )}

          <div className="mc-meta-row">
            <span className="mc-meta-item">
              <i className="fa-regular fa-clock" />
              {fmtDateTime(canvas.scheduled_at)}
              {canvas.duration_min && <span className="mc-duration"> · {canvas.duration_min}분</span>}
            </span>
            {canvas.location && (
              <span className="mc-meta-item">
                <i className="fa-solid fa-location-dot" />
                {canvas.location}
              </span>
            )}
            <span className="mc-meta-item">
              <i className="fa-solid fa-user-tie" />
              {canvas.host_name || '주최자'}
            </span>
          </div>
        </div>

        {/* 단계 인디케이터 */}
        <div className="mc-phase-track">
          {MEETING_PHASES.filter(p => p.value !== 'archived').map((p, i) => {
            const isActive = canvas.phase === p.value;
            const isPast = MEETING_PHASES.findIndex(x => x.value === canvas.phase) > i;
            return (
              <div
                key={p.value}
                className={`mc-phase-step ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                style={isActive ? { '--phase-color': p.color } : {}}
              >
                <span className="mc-phase-dot">
                  {isPast ? <i className="fa-solid fa-check" /> : <i className={`fa-solid ${p.icon}`} />}
                </span>
                <span className="mc-phase-label">{p.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 단계 전환 액션 */}
      {isHost && canvas.phase === 'pre' && (
        <div className="mc-phase-action">
          <button
            type="button"
            className="mc-btn-start"
            onClick={handleStartMeeting}
          >
            <i className="fa-solid fa-microphone" /> 회의 시작하기
          </button>
        </div>
      )}
    </header>
  );
}