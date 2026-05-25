// components/dashboard/AttendanceCard.jsx
// INJOY 포인트 현황 위젯 — 출근기록 자리 교체.
//
// 표시:
//   - 보유 포인트 (큰 숫자)
//   - 레벨 + 다음 레벨까지 진행률 바
//   - 이번 달 받은 칭찬 수 + 완료한 미션 수
//   - 클릭 시 INJOY Hub 로 이동

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useHub } from '../../contexts/HubContext';

export default function AttendanceCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kudos, progresses, missions, myStats } = useHub();

  /* 이번 달 통계 */
  const thisMonthStats = useMemo(() => {
    if (!user) return { kudosCount: 0, missionCount: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    /* 이번 달 받은 칭찬 */
    const kudosCount = kudos.filter(
      (k) =>
        k.to_id === user.id &&
        new Date(k.created_at).getTime() >= monthStart
    ).length;

    /* 이번 달 완료한 미션 */
    const missionCount = progresses.filter((p) => {
      if (p.user_id !== user.id || p.status !== 'completed') return false;
      if (!p.completed_at) return false;
      return new Date(p.completed_at).getTime() >= monthStart;
    }).length;

    return { kudosCount, missionCount };
  }, [kudos, progresses, user]);

  /* 레벨 진행률 (%) */
  const levelPct = useMemo(() => {
    if (!myStats?.nextLevelAt) return 0;
    return Math.min(100, (myStats.progressInLevel / myStats.nextLevelAt) * 100);
  }, [myStats]);

  return (
    <section
      className="panel points-card"
      onClick={() => navigate('/injoyhub')}
      style={{ cursor: 'pointer' }}
    >
      <div
        className="panel-header"
        style={{
          marginBottom: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-coins" style={{ color: '#f59e0b' }} />
          INJOY 포인트
        </h2>
        <span
          className="points-level-badge"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            color: '#fff',
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          Lv. {myStats?.level || 1}
        </span>
      </div>

      {/* 보유 포인트 */}
      <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
        <div
          style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.1,
          }}
        >
          {(myStats?.total || 0).toLocaleString()}
          <span style={{ fontSize: '1.2rem', marginLeft: 4, opacity: 0.9 }}>P</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
          누적 획득 {(myStats?.earned || 0).toLocaleString()}P · 사용 {(myStats?.spent || 0).toLocaleString()}P
        </p>
      </div>

      {/* 레벨 진행률 바 */}
      <div style={{ marginTop: 14, marginBottom: 4 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            marginBottom: 5,
          }}
        >
          <span>다음 레벨까지</span>
          <span style={{ fontWeight: 700 }}>
            {myStats?.progressInLevel || 0} / {myStats?.nextLevelAt || 100}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: 'var(--bg-2)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${levelPct}%`,
              background: 'linear-gradient(90deg, #f59e0b, #ec4899)',
              transition: 'width 0.4s',
            }}
          />
        </div>
      </div>

      {/* 이번 달 통계 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <i className="fa-solid fa-heart" style={{ color: '#f72585', marginRight: 4 }} />
            이달의 칭찬
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {thisMonthStats.kudosCount}
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 3 }}>개</span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            <i className="fa-solid fa-flag-checkered" style={{ color: '#06d6a0', marginRight: 4 }} />
            완료 미션
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {thisMonthStats.missionCount}
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 3 }}>개</span>
          </div>
        </div>
      </div>

      {/* 하단 액션 — INJOY Hub 이동 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          navigate('/injoyhub');
        }}
        style={{
          marginTop: 14,
          width: '100%',
          padding: 10,
          border: 'none',
          borderRadius: 8,
          background: 'linear-gradient(135deg, var(--primary-color), #7048e8)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <i className="fa-solid fa-store" />
        포인트 상점 가기
      </button>
    </section>
  );
}