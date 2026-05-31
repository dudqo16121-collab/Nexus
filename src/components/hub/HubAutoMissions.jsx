// components/hub/HubAutoMissions.jsx
// 자동 미션 보드 — 주간 도전 과제.

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useHub } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

function getDaysUntilMonday() {
  const d = new Date();
  const day = d.getDay();
  const daysLeft = day === 0 ? 1 : 8 - day; // 일요일이면 내일이 월요일
  return daysLeft;
}

export default function HubAutoMissions() {
  const toast = useToast();
  const { profile } = useAuth();
  const { autoMissionProgress, claimAutoMission, openMissionEditor } = useHub();
  const [claimingId, setClaimingId] = useState(null);
  const isAdmin = profile?.is_admin === true;

  const daysLeft = getDaysUntilMonday();

  const handleClaim = async (mission) => {
    setClaimingId(mission.id);
    const res = await claimAutoMission(mission.id);
    setClaimingId(null);
    if (res.ok) {
      toast.success(`🎉 +${res.points}P 적립!`);
    } else {
      toast.error(res.error);
    }
  };

  /* 진행률 순으로 정렬 — 완료된 건 위로, 진행 중인 건 진행률 높은 순 */
  const sorted = [...autoMissionProgress].sort((a, b) => {
    if (a.completed && !a.claimed && (!b.completed || b.claimed)) return -1;
    if (b.completed && !b.claimed && (!a.completed || a.claimed)) return 1;
    if (a.claimed && !b.claimed) return 1;
    if (b.claimed && !a.claimed) return -1;
    return b.percent - a.percent;
  });

  return (
    <section className="hub-card hub-auto-card">
      <header className="hub-card-header">
        <h3>
          <i className="fa-solid fa-bolt" style={{ color: '#f59e0b' }} />
          이번 주 도전 과제
        </h3>
        <div className="hub-auto-week-info">
          <i className="fa-regular fa-clock" />
          <span>{daysLeft}일 남음</span>
        </div>
      </header>

      <div className="hub-auto-list">
        {sorted.length === 0 ? (
          <div className="hub-empty">
            <i className="fa-solid fa-bullseye" />
            <p>활성화된 도전 과제가 없어요</p>
          </div>
        ) : (
          sorted.map((m) => (
            <div
              key={m.id}
              className={`hub-auto-item ${m.completed ? 'completed' : ''} ${m.claimed ? 'claimed' : ''}`}
            >
              <div
                className="hub-auto-icon"
                style={{ background: `${m.color}15`, color: m.color }}
              >
                <i className={`fa-solid ${m.icon}`} />
              </div>

              <div className="hub-auto-body">
                <div className="hub-auto-title-row">
                  <strong>{m.title}</strong>
                  <span className="hub-auto-points">+{m.points}P</span>
                </div>
                {m.description && (
                  <p className="hub-auto-desc">{m.description}</p>
                )}

                {/* 진행률 바 */}
                <div className="hub-auto-progress">
                  <div className="hub-auto-progress-track">
                    <div
                      className={`hub-auto-progress-fill ${m.completed ? 'done' : ''}`}
                      style={{
                        width: `${m.percent}%`,
                        background: m.completed
                          ? 'linear-gradient(90deg, #22c55e, #06d6a0)'
                          : `linear-gradient(90deg, ${m.color}, ${m.color}cc)`,
                      }}
                    />
                  </div>
                  <span className="hub-auto-progress-text">
                    <strong>{m.achieved}</strong> / {m.target}
                  </span>
                </div>
              </div>

              {/* 우측 액션 */}
              <div className="hub-auto-action">
                {m.claimed ? (
                  <span className="hub-auto-claimed">
                    <i className="fa-solid fa-check-double" />
                    완료
                  </span>
                ) : m.completed ? (
                  <button
                    type="button"
                    className="hub-auto-claim-btn"
                    onClick={() => handleClaim(m)}
                    disabled={claimingId === m.id}
                  >
                    <i className="fa-solid fa-gift" />
                    보상 받기
                  </button>
                ) : (
                  <div className="hub-auto-remain">
                    <strong>{m.target - m.achieved}</strong>
                    <span>남음</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

{/* 관리자 — 관리 페이지 링크 */}
{isAdmin && (
  <div className="hub-auto-admin-hint">
    <i className="fa-solid fa-circle-info" />
    <span>도전 과제는 <a href="/admin" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>시스템 전체관리 → 도전 과제</a> 탭에서 관리할 수 있어요.</span>
  </div>
)}
    </section>
  );
}