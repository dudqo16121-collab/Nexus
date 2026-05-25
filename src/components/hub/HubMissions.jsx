// 진행 중인 미션 목록 + 참여/완료.

import { useHub } from '../../contexts/HubContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function HubMissions() {
  const {
    activeMissions, getMyProgress, joinMission, completeMission, leaveMission,
    openMissionEditor,
  } = useHub();
  const { profile } = useAuth();
  const toast = useToast();
  const isAdmin = profile?.is_admin === true;

  const handleJoin = async (id) => {
    const res = await joinMission(id);
    if (res.ok) toast.success('미션에 참여했어요! 화이팅 💪');
    else toast.error(res.error);
  };
  const handleComplete = async (pid) => {
    const res = await completeMission(pid);
    if (res.ok) toast.success('🎉 미션 완료! 포인트가 적립되었어요.');
    else toast.error(res.error);
  };
  const handleLeave = async (pid) => {
    if (!window.confirm('이 미션을 그만두시겠어요?')) return;
    const res = await leaveMission(pid);
    if (res.ok) toast.success('미션을 그만뒀어요.');
    else toast.error(res.error);
  };

  return (
    <section className="hub-card">
      <header className="hub-card-header">
        <h3>
          <i className="fa-solid fa-bullseye" style={{ color: 'var(--danger)' }} />
          진행 중인 미션
        </h3>
        {isAdmin && (
          <button
            type="button"
            className="hub-card-action"
            onClick={() => openMissionEditor(null)}
          >
            <i className="fa-solid fa-plus" /> 추가
          </button>
        )}
      </header>

      <div className="hub-mission-list">
        {activeMissions.length === 0 ? (
          <div className="hub-empty">
            <i className="fa-solid fa-bullseye" />
            <p>현재 진행 중인 미션이 없어요</p>
          </div>
        ) : (
          activeMissions.map((m) => {
            const myProg = getMyProgress(m.id);
            const isJoined = !!myProg && myProg.status === 'joined';
            const isCompleted = myProg?.status === 'completed';

            return (
              <div key={m.id} className={`hub-mission ${isCompleted ? 'completed' : ''}`}>
                <div className="hub-mission-icon">
                  <i className={`fa-solid ${m.icon || 'fa-bullseye'}`} />
                </div>
                <div className="hub-mission-body">
                  <div className="hub-mission-title-row">
                    <strong>{m.title}</strong>
                    <span className="hub-mission-points">+{m.points} P</span>
                  </div>
                  {m.description && <p>{m.description}</p>}
                  {m.end_date && (
                    <span className="hub-mission-deadline">
                      <i className="fa-regular fa-calendar" /> {m.end_date}까지
                    </span>
                  )}
                </div>
                <div className="hub-mission-actions">
                  {isCompleted ? (
                    <span className="hub-mission-done">
                      <i className="fa-solid fa-check-double" /> 완료
                    </span>
                  ) : isJoined ? (
                    <>
                      <button
                        type="button"
                        className="hub-mission-btn primary"
                        onClick={() => handleComplete(myProg.id)}
                      >
                        완료 체크
                      </button>
                      <button
                        type="button"
                        className="hub-mission-btn ghost"
                        onClick={() => handleLeave(myProg.id)}
                        title="포기"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="hub-mission-btn primary"
                      onClick={() => handleJoin(m.id)}
                    >
                      참여하기
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      className="hub-mission-btn ghost"
                      onClick={() => openMissionEditor(m)}
                      title="수정"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}