// hooks/useLeaveBadge.js
// 대시보드 '잔여 연차' 위젯 동기화용.
// 원본 _renderLeaveSummary 의 dashboard-leave-count innerHTML 갱신 로직을 대체.
//
// 사용법 (useApprovalBadge 와 동일 패턴 — 숫자만 반환, 중괄호 없음):
//   const remaining = useLeaveBadge();          // 잔여 일수만
//   const { remaining, total } = useLeaveBadge({ withTotal: true });
//
// 주의: LeaveProvider 하위에서만 동작한다. 대시보드가 LeaveProvider 밖이라면
//       App 트리에서 LeaveProvider 를 대시보드 위로 올려야 한다.

import { useLeave } from '../contexts/LeaveContext';

export function useLeaveBadge(opts = {}) {
  const { summary } = useLeave();
  if (opts.withTotal) {
    return { remaining: summary.remaining, total: summary.total };
  }
  return summary.remaining;
}

export default useLeaveBadge;
