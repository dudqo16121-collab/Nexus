// components/dashboard/DashboardMeetings.jsx
// 대시보드 위젯 — 오늘/내일/이번 주 다가오는 회의.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetingCanvas } from '../../contexts/MeetingCanvasContext';
import { getPhaseMeta } from '../../config/meetingCanvasConfig';

function fmtMeetingTime(iso) {
  if (!iso) return '시간 미정';
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
  const tomEnd = new Date(todayStart); tomEnd.setDate(tomEnd.getDate() + 2);

  const hm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  if (d >= todayStart && d < todayEnd) return `오늘 ${hm}`;
  if (d >= todayEnd && d < tomEnd) return `내일 ${hm}`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' ' + hm;
}

function dDayLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.round((d - now) / 60000);
  if (diffMin < -60) return null;       // 1시간 이상 지남 — 표시 안함
  if (diffMin < 0) return '진행 중';
  if (diffMin < 15) return '곧 시작';
  if (diffMin < 60) return `${diffMin}분 후`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)}시간 후`;
  const days = Math.floor(diffMin / (24 * 60));
  return `${days}일 후`;
}

export default function DashboardMeetings() {
  const navigate = useNavigate();
  const { myMeetings, meetingsLoading, fetchCanvas } = useMeetingCanvas();

  const upcoming = useMemo(() => {
    if (!myMeetings?.length) return [];
    const now = new Date();
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() + 7);
    const liveNowCutoff = new Date(now); liveNowCutoff.setHours(now.getHours() - 1);

    return myMeetings
      .filter((m) => {
        /* Live 단계는 무조건 포함 */
        if (m.phase === 'live') return true;
        /* Pre 단계 중 1주일 이내 + 1시간 이상 지나지 않은 것 */
        if (m.phase !== 'pre') return false;
        if (!m.scheduled_at) return false;
        const t = new Date(m.scheduled_at);
        return t >= liveNowCutoff && t < cutoff;
      })
      .sort((a, b) => {
        /* Live 우선, 그 다음 시간순 */
        if (a.phase === 'live' && b.phase !== 'live') return -1;
        if (a.phase !== 'live' && b.phase === 'live') return 1;
        return new Date(a.scheduled_at) - new Date(b.scheduled_at);
      })
      .slice(0, 5);
  }, [myMeetings]);

  const handleOpen = (m) => {
    fetchCanvas(m.id);
    navigate('/meetings');
  };

return (
    <section className="panel dashboard-meetings-widget" id="dashboard-meetings">
      <div className="panel-header" style={{ marginBottom: 15 }}>
        <h2>
          <i
            className="fa-solid fa-microphone"
            style={{ color: '#ec4899', marginRight: 8 }}
          />
          다가오는 회의
        </h2>
        <span
          style={{
            fontSize: '0.85rem',
            cursor: 'pointer',
            color: 'var(--primary-color)',
            fontWeight: 600,
          }}
          onClick={() => navigate('/meetings')}
        >
          전체 보기 <i className="fa-solid fa-arrow-right" style={{ marginLeft: 3 }} />
        </span>
      </div>

      <div className="dashboard-meetings-list">
        {meetingsLoading ? (
          <div className="dashboard-meetings-empty">
            <i className="fa-solid fa-spinner fa-spin" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="dashboard-meetings-empty">
            <i className="fa-regular fa-calendar" />
            <p>다가오는 회의가 없어요</p>
            <button
              type="button"
              className="dashboard-meetings-create"
              onClick={() => navigate('/meetings')}
            >
              + 새 회의 만들기
            </button>
          </div>
        ) : (
          upcoming.map((m) => {
            const meta = getPhaseMeta(m.phase);
            const isLive = m.phase === 'live';
            const dDay = isLive ? '🔴 LIVE' : dDayLabel(m.scheduled_at);
            return (
              <button
                type="button"
                key={m.id}
                className={`dashboard-meetings-item ${isLive ? 'live' : ''}`}
                onClick={() => handleOpen(m)}
              >
                <div className="dashboard-meetings-item-time">
                  {fmtMeetingTime(m.scheduled_at || m.created_at)}
                </div>
                <div className="dashboard-meetings-item-body">
                  <div className="dashboard-meetings-item-title">{m.title}</div>
                  <div className="dashboard-meetings-item-meta">
                    {m.location && (
                      <span><i className="fa-solid fa-location-dot" /> {m.location}</span>
                    )}
                    {m.host_name && (
                      <span><i className="fa-solid fa-user-tie" /> {m.host_name}</span>
                    )}
                  </div>
                </div>
                {dDay && (
                  <div
                    className="dashboard-meetings-item-dday"
                    style={{
                      background: isLive ? '#f72585' : `${meta.color}22`,
                      color: isLive ? '#fff' : meta.color,
                    }}
                  >
                    {dDay}
                  </div>
                )}
              </button>
            );
          })
        )}
</div>
    </section>
  );
}