// components/hub/HubBadgeToast.jsx
// 뱃지 획득 알림 — recentBadge가 set되면 자동 토스트.

import { useEffect } from 'react';
import { useHub, BADGE_RARITY } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

export default function HubBadgeToast() {
  const { recentBadge, clearRecentBadge } = useHub();
  const toast = useToast();

  useEffect(() => {
    if (!recentBadge) return;
    const rarity = BADGE_RARITY[recentBadge.rarity] || BADGE_RARITY.common;
    toast.success(
      `🎉 [${rarity.label}] 뱃지 획득: ${recentBadge.title} (+${recentBadge.bonus_points}P)`,
      { duration: 5000 }
    );
    clearRecentBadge();
  }, [recentBadge, toast, clearRecentBadge]);

  return null;
}