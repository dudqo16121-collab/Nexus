// components/meeting/phases/ArchivedMeetingPhase.jsx
// 보관된 회의 — Post 와 비슷하지만 읽기 전용 + 캔버스 변환 불가.

import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { DECISION_TYPES } from '../../../config/meetingCanvasConfig';
import DecisionCard from '../parts/DecisionCard';

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

export default function ArchivedMeetingPhase() {
  const { user } = useAuth();
  const { current, transitionPhase } = useMeetingCanvas();
  const toast = useToast();

  if (!current) return null;
  const { canvas, attendees, decisions, agendaItems } = current;
  const isHost = canvas.host_id === user?.id;

  const duration = fmtDuration(canvas.started_at, canvas.ended_at);

  /* 통계 */
  const stats = {
    attendees: attendees.length,
    agendaDone: agendaItems.filter((a) => a.status === 'done').length,
    agendaTotal: agendaItems.length,
    decisions: decisions.filter((d) => d.type === 'decision').length,
    actions: decisions.filter((d) => d.type === 'action').length,
    converted: decisions.filter((d) => d.type === 'action' && d.task_id).length,
  };

  /* 타입별 그룹화 */
  const grouped = decisions.reduce((acc, d) => {
    if (!acc[d.type]) acc[d.type] = [];
    acc[d.type].push(d);
    return acc;
  }, {});

  const handleUnarchive = async () => {
    if (!confirm('보관을 해제하고 "회의 후" 단계로 되돌릴까요?')) return;
    const res = await transitionPhase(canvas.id, 'post');
    if (res.ok) toast.success('보관 해제됐어요');
    else toast.error(res.error);
  };

  return (
    <div className="mc-post mc-archived">
      {/* 보관 배너 */}
      <div className="mc-archived-banner">
        <div className="mc-archived-banner-icon">
          <i className="fa-solid fa-box-archive" />
        </div>
        <div className="mc-archived-banner-body">
          <h2>보관된 회의</h2>
          <p>
            {duration && <>진행 시간 <strong>{duration}</strong> · </>}
            {canvas.ended_at && (
              <>종료 <strong>{new Date(canvas.ended_at).toLocaleDateString('ko-KR')}</strong> · </>
            )}
            결정 <strong>{stats.decisions}</strong>건 · 액션 <strong>{stats.actions}</strong>건
          </p>
        </div>
        {isHost && (
          <button
            type="button"
            className="mc-btn-sm"
            onClick={handleUnarchive}
            title="보관 해제"
          >
            <i className="fa-solid fa-box-open" /> 보관 해제
          </button>
        )}
      </div>

      {/* 통계 */}
      <div className="mc-post-stats">
        <div className="mc-post-stat">
          <strong>{stats.attendees}</strong><span>참석자</span>
        </div>
        <div className="mc-post-stat">
          <strong>{stats.agendaDone}/{stats.agendaTotal}</strong><span>안건</span>
        </div>
        <div className="mc-post-stat">
          <strong>{stats.decisions}</strong><span>결정</span>
        </div>
        <div className="mc-post-stat">
          <strong>{stats.actions}</strong><span>액션</span>
        </div>
      </div>

      {/* 회의록 */}
      {canvas.summary && (
        <section className="mc-post-summary">
          <div className="mc-section-head">
            <h3>
              <i className="fa-solid fa-file-lines" style={{ color: '#06d6a0' }} />
              회의록
            </h3>
          </div>
          <div className="mc-archived-summary-view">
            {canvas.summary.split('\n').map((line, i) => (
              <p key={i}>{line || '\u00a0'}</p>
            ))}
          </div>
        </section>
      )}

      {/* 결정/액션 */}
      {decisions.length > 0 && (
        <section className="mc-post-decisions">
          <div className="mc-section-head">
            <h3>
              <i className="fa-solid fa-clipboard-check" style={{ color: '#4361ee' }} />
              결정 / 액션 ({decisions.length})
            </h3>
          </div>
          <div className="mc-post-groups">
            {DECISION_TYPES.map((t) => {
              const items = grouped[t.value] || [];
              if (items.length === 0) return null;
              return (
                <div key={t.value} className="mc-post-group">
                  <div className="mc-post-group-head" style={{ borderLeftColor: t.color }}>
                    <span className="mc-post-group-title" style={{ color: t.color }}>
                      <i className={`fa-solid ${t.icon}`} /> {t.label}
                    </span>
                    <span className="mc-post-group-count">{items.length}건</span>
                  </div>
                  <div className="mc-post-group-list">
                    {items.map((d) => <DecisionCard key={d.id} decision={d} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 안건이 있으면 마지막에 */}
      {agendaItems.length > 0 && (
        <section className="mc-post-decisions">
          <div className="mc-section-head">
            <h3>
              <i className="fa-solid fa-list-check" style={{ color: '#ec4899' }} />
              논의된 안건 ({agendaItems.length})
            </h3>
          </div>
          <ol className="mc-archived-agenda">
            {agendaItems.map((a, idx) => (
              <li
                key={a.id}
                className={`mc-archived-agenda-item ${a.status === 'done' ? 'done' : ''}`}
              >
                <span className="mc-archived-agenda-num">{idx + 1}.</span>
                <span className="mc-archived-agenda-topic">{a.topic}</span>
                {a.status === 'done' && <i className="fa-solid fa-check" style={{ color: '#06d6a0' }} />}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}