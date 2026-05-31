// components/hub/HubHero.jsx
// 페이지 최상단 — 내 레벨 / 진행 바 / 받은 칭찬 통계 / 뱃지 진열장.

import { useState } from 'react';
import { useHub } from '../../contexts/HubContext';
import { useAuth } from '../../contexts/AuthContext';
import HubBadgesModal from './HubBadgesModal';

export default function HubHero() {
  const { myStats, myReceivedKudos, openSendKudos, badgeProgress } = useHub();
  const { profile } = useAuth();
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);

  const progressPct = (myStats.progressInLevel / myStats.nextLevelAt) * 100;
  const monthCount = myReceivedKudos.filter((k) => {
    const t = new Date(k.created_at);
    const now = new Date();
    return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth();
  }).length;

  const earnedCount = badgeProgress.filter((b) => b.earned).length;
  const totalBadges = badgeProgress.length;

  return (
    <section className="hub-hero">
      <div className="hub-hero-bg" />

      <div className="hub-hero-content">
        <div className="hub-hero-left">
          <div className="hub-hero-greeting">
            안녕하세요, <strong>{profile?.full_name || '동료'}</strong>님 👋
          </div>
          <div className="hub-hero-tagline">
            오늘도 함께 만들어가는 NEXUS
          </div>
        </div>

        <div className="hub-hero-stats">
          <div className="hub-hero-stat">
            <div className="hub-hero-stat-label">레벨</div>
            <div className="hub-hero-stat-value">Lv. {myStats.level}</div>
          </div>
          <div className="hub-hero-stat">
            <div className="hub-hero-stat-label">총 포인트</div>
            <div className="hub-hero-stat-value">{myStats.total} P</div>
          </div>
          <div className="hub-hero-stat">
            <div className="hub-hero-stat-label">이번달 받은 칭찬</div>
            <div className="hub-hero-stat-value">{monthCount} 개</div>
          </div>

          {/* 뱃지 진열장 버튼 */}
          <button
            type="button"
            className="hub-hero-badges-btn"
            onClick={() => setBadgesModalOpen(true)}
            title="뱃지 진열장 열기"
          >
            <i className="fa-solid fa-medal" />
            <div className="hub-hero-badges-btn-info">
              <span className="hub-hero-badges-btn-label">뱃지</span>
              <span className="hub-hero-badges-btn-count">
                <strong>{earnedCount}</strong>
                <em>/ {totalBadges}</em>
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* XP 진행 바 */}
      <div className="hub-hero-xpbar">
        <div className="hub-hero-xpbar-info">
          <span>Lv. {myStats.level}</span>
          <span>{myStats.progressInLevel} / {myStats.nextLevelAt} XP</span>
          <span>Lv. {myStats.level + 1}</span>
        </div>
        <div className="hub-hero-xpbar-track">
          <div className="hub-hero-xpbar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <button
        type="button"
        className="hub-hero-cta"
        onClick={() => openSendKudos()}
      >
        <i className="fa-solid fa-heart" /> 동료에게 칭찬 보내기
      </button>

      {/* 뱃지 모달 */}
      <HubBadgesModal
        isOpen={badgesModalOpen}
        onClose={() => setBadgesModalOpen(false)}
      />
    </section>
  );
}