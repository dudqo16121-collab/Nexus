// components/hub/HubBadges.jsx
// 내 뱃지 진열장 — 획득한 뱃지 + 진행 중인 뱃지.
// inModal prop으로 모달 안/밖 사용 모두 지원.

import { useState } from 'react';
import { useHub, BADGE_RARITY } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

const CATEGORY_LABELS = {
  kudos: '칭찬',
  attendance: '출석',
  activity: '활동',
  special: '특별',
  general: '일반',
};

export default function HubBadges({ inModal = false }) {
  const toast = useToast();
  const { badgeProgress, setFeaturedBadge } = useHub();

  const [filter, setFilter] = useState('all');

  const categories = Array.from(new Set(badgeProgress.map((b) => b.category)));

  const filtered = badgeProgress.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'earned') return b.earned;
    if (filter === 'inprogress') return !b.earned && b.current > 0;
    return b.category === filter;
  });

  const totalEarned = badgeProgress.filter((b) => b.earned).length;
  const totalCount = badgeProgress.length;

  const handleToggleFeatured = async (badge) => {
    if (!badge.earned) return;
    const res = await setFeaturedBadge(badge.isFeatured ? null : badge.id);
    if (res.ok) {
      toast.success(
        badge.isFeatured ? '대표 뱃지를 해제했어요.' : `"${badge.title}"을(를) 대표 뱃지로 설정했어요!`
      );
    } else {
      toast.error(res.error);
    }
  };

  /* 모달 안일 때는 헤더 생략 (모달이 헤더 처리) */
  const content = (
    <>
      {!inModal && (
        <header className="hub-card-header">
          <h3>
            <i className="fa-solid fa-medal" style={{ color: '#f59e0b' }} />
            뱃지 진열장
          </h3>
          <div className="hub-badges-stats">
            <strong>{totalEarned}</strong>
            <span>/ {totalCount}</span>
          </div>
        </header>
      )}

      {/* 모달 안에선 통계를 상단에 표시 */}
      {inModal && (
        <div className="hub-badges-modal-summary">
          <span>획득한 뱃지</span>
          <strong>{totalEarned}</strong>
          <span>/ {totalCount}</span>
        </div>
      )}

      {/* 필터 */}
      <div className="hub-badges-filters">
        <button
          type="button"
          className={`hub-badges-filter ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          전체
        </button>
        <button
          type="button"
          className={`hub-badges-filter ${filter === 'earned' ? 'active' : ''}`}
          onClick={() => setFilter('earned')}
        >
          획득
        </button>
        <button
          type="button"
          className={`hub-badges-filter ${filter === 'inprogress' ? 'active' : ''}`}
          onClick={() => setFilter('inprogress')}
        >
          진행 중
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`hub-badges-filter ${filter === c ? 'active' : ''}`}
            onClick={() => setFilter(c)}
          >
            {CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      {/* 뱃지 그리드 */}
      <div className="hub-badges-grid">
        {filtered.length === 0 ? (
          <div className="hub-badges-empty">
            <i className="fa-regular fa-circle-question" />
            <p>해당하는 뱃지가 없어요</p>
          </div>
        ) : (
          filtered.map((b) => {
            const rarity = BADGE_RARITY[b.rarity] || BADGE_RARITY.common;
            return (
              <div
                key={b.id}
                className={`hub-badge-card rarity-${b.rarity} ${b.earned ? 'earned' : 'locked'} ${b.isFeatured ? 'featured' : ''}`}
                onClick={() => b.earned && handleToggleFeatured(b)}
                style={
                  b.earned
                    ? { '--rarity-color': rarity.color, '--rarity-glow': rarity.glow }
                    : { '--rarity-color': '#9ca3af' }
                }
              >
                {b.isFeatured && (
                  <div className="hub-badge-featured-tag">
                    <i className="fa-solid fa-star" /> 대표
                  </div>
                )}

                <div className="hub-badge-rarity-tag">
                  {rarity.label}
                </div>

                <div className="hub-badge-icon">
                  <i className={`fa-solid ${b.icon}`} />
                  {!b.earned && (
                    <div className="hub-badge-lock">
                      <i className="fa-solid fa-lock" />
                    </div>
                  )}
                </div>

                <h4 className="hub-badge-title">{b.title}</h4>
                <p className="hub-badge-desc">{b.description}</p>

                {b.earned ? (
                  <div className="hub-badge-earned">
                    <i className="fa-solid fa-check-circle" />
                    {new Date(b.earnedAt).toLocaleDateString('ko-KR')}
                  </div>
                ) : (
                  <div className="hub-badge-progress">
                    <div className="hub-badge-progress-track">
                      <div
                        className="hub-badge-progress-fill"
                        style={{ width: `${b.percent}%` }}
                      />
                    </div>
                    <span>
                      {b.current} / {b.target}
                    </span>
                  </div>
                )}

                <div className="hub-badge-bonus">
                  <i className="fa-solid fa-coins" /> +{b.bonus_points}P
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hub-badges-hint">
        <i className="fa-solid fa-circle-info" />
        획득한 뱃지를 클릭하면 대표 뱃지로 설정/해제할 수 있어요. 대표 뱃지는 그룹웨어 인사 영역에 표시돼요.
      </div>
    </>
  );

  /* 모달 안일 때는 wrapper 없이 */
  if (inModal) {
    return <div className="hub-badges-modal-body">{content}</div>;
  }

  /* 페이지에 직접 쓸 때 */
  return <section className="hub-card hub-badges-card">{content}</section>;
}