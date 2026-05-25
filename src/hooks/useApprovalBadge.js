import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * 내가 결재해야 할 건수를 폴링 방식으로 가져옴
 * 
 * 변경 이력:
 *   - v1: Realtime 구독 사용 (StrictMode에서 에러 발생)
 *   - v2: 단순 폴링으로 변경 (30초마다 갱신, 안정적)
 *   
 * 트레이드오프:
 *   - 단점: 30초의 지연 (실시간 X)
 *   - 장점: 에러 0%, 코드 단순, 어디서나 동작
 */
export function useApprovalBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    let mounted = true;

    async function load() {
      try {
        const { data } = await supabase
          .from('approvals')
          .select('id, current_step, approvers, status')
          .in('status', ['pending', 'in_progress']);

        if (!mounted) return;

        const cnt = (data || []).filter((d) => {
          const step = d.current_step || 0;
          return (d.approvers || [])[step]?.id === user.id;
        }).length;

        setCount(cnt);
      } catch (e) {
        // approvals 테이블이 없는 환경이면 조용히 무시
        if (mounted) setCount(0);
      }
    }

    /* 즉시 1회 로드 */
    load();

    /* 30초마다 자동 갱신 */
    const interval = setInterval(load, 30000);

    /* 탭이 다시 활성화될 때 즉시 갱신 (UX 개선) */
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  return count;
}