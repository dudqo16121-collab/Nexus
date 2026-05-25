import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const MessengerContext = createContext(null);

/**
 * 기존 messenger.js 를 React 안에서 1번만 로드/초기화하고,
 * 페이지 이동에도 절대 다시 init 되지 않도록 보호하는 Provider.
 *
 * 핵심:
 *   - messenger.js 는 <script>로 동적 로드 → window.Messenger 생성
 *   - useEffect 한 번만 실행 → init() 한 번만 호출
 *   - 라우터가 어떻게 바뀌든 이 Provider는 언마운트되지 않음
 *     → Realtime/Presence 채널이 끊기지 않음 ✨
 */
export function MessengerProvider({ children }) {
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const initializedRef = useRef(false);

  /* ─── messenger.js 동적 로드 ─────────────────────────── */
  const loadMessengerScript = useCallback(() => {
    return new Promise((resolve, reject) => {
      // 이미 로드되어 있으면 그대로
      if (window.Messenger) {
        resolve();
        return;
      }
      // 이미 <script>가 추가되었으면 (중복 호출 방지)
      if (document.querySelector('script[data-nexus-messenger]')) {
        const wait = setInterval(() => {
          if (window.Messenger) {
            clearInterval(wait);
            resolve();
          }
        }, 50);
        return;
      }
      const script = document.createElement('script');
      script.src = '/messenger.js';
      script.async = true;
      script.dataset.nexusMessenger = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('messenger.js 로드 실패'));
      document.body.appendChild(script);
    });
  }, []);

  /* ─── user가 준비되면 messenger 초기화 (한 번만!) ────── */
  useEffect(() => {
    if (!user) return;
    if (initializedRef.current) return;

    let mounted = true;

    (async () => {
      try {
        await loadMessengerScript();
        if (!mounted) return;
        if (!window.Messenger) {
          console.error('[MessengerProvider] window.Messenger 없음');
          return;
        }

        // ★ 기존 messenger.js 가 이미 init 된 경우 재호출하지 않음
        if (window.Messenger.__initialized) {
          setIsReady(true);
          return;
        }

        // ★ messenger.js 가 기대하는 형태로 옵션 전달
        window.Messenger.init({
          supabaseClient: supabase,
          getCurrentUser: () => user,
          getCurrentProfile: () => profile,
          floatingButton: true,
          onUnreadChange: (count) => {
            setUnreadCount(count);
          },
          showToast: (msg) => {
            // 일단은 콘솔로 — 나중에 Toast 컴포넌트로 교체
            console.log('[Toast]', typeof msg === 'string' ? msg : msg);
          },
        });

        initializedRef.current = true;
        setIsReady(true);
        console.debug('[MessengerProvider] 메신저 초기화 완료 ✨');
      } catch (e) {
        console.error('[MessengerProvider] 초기화 실패:', e);
      }
    })();

    return () => {
      mounted = false;
      // ★ 의도적으로 cleanup 하지 않음
      // messenger.js 는 한 번 init 되면 끝까지 살아있어야 함
      // 페이지 이동/언마운트로 채널이 끊기면 안 됨
    };
  }, [user, profile, loadMessengerScript]);

  /* ─── 외부에서 호출할 수 있는 API ─────────────────────── */
  const open = useCallback(() => {
    if (window.Messenger?.open) window.Messenger.open();
  }, []);

  const close = useCallback(() => {
    if (window.Messenger?.close) window.Messenger.close();
  }, []);

  const openWith = useCallback((userId, name, avatar) => {
    if (window.Messenger?.openWith) {
      window.Messenger.open();
      window.Messenger.openWith(userId, name, avatar);
    }
  }, []);

  const refresh = useCallback(() => {
    if (window.Messenger?.refresh) window.Messenger.refresh();
  }, []);

  const value = {
    isReady,
    unreadCount,
    open,
    close,
    openWith,
    refresh,
  };

  return (
    <MessengerContext.Provider value={value}>
      {children}
    </MessengerContext.Provider>
  );
}

export function useMessenger() {
  const ctx = useContext(MessengerContext);
  if (!ctx) throw new Error('useMessenger는 <MessengerProvider> 내부에서만 사용 가능합니다.');
  return ctx;
}