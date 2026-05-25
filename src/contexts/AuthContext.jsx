import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const PUBLIC_PATHS = ['/auth', '/login', '/signup', '/reset'];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileFetchedFor = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isDemo = useCallback(() => {
    const usp = new URLSearchParams(location.search);
    if (usp.get('demo') === '1') {
      try { localStorage.setItem('nexus_demo', '1'); } catch (_) {}
      return true;
    }
    try { return localStorage.getItem('nexus_demo') === '1'; } catch (_) { return false; }
  }, [location.search]);

  const loadProfile = useCallback(async (uid) => {
    if (!uid || profileFetchedFor.current === uid) return;
    profileFetchedFor.current = uid;

    const baseCols = 'id, email, full_name, department, position, phone, avatar_url, status_msg, is_admin, is_online, birth_date';
    const fallbackCols = 'id, email, full_name, department, phone, avatar_url, status_msg, is_admin, is_online, birth_date';

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(baseCols)
        .eq('id', uid)
        .maybeSingle();
      if (error && /position/i.test(error.message || '')) throw error;
      setProfile(data);
    } catch (e) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select(fallbackCols)
          .eq('id', uid)
          .maybeSingle();
        setProfile(data);
      } catch (_) {
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const s = data?.session || null;
      setSession(s);
      setUser(s?.user || null);
      if (s?.user) loadProfile(s.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.debug('[Auth] event:', event);
        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setProfile(null);
          profileFetchedFor.current = null;
          if (!PUBLIC_PATHS.includes(location.pathname)) {
            navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`,
              { replace: true });
          }
        }
        if (event === 'SIGNED_IN' && newSession?.user) {
          loadProfile(newSession.user.id);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); }
    try { localStorage.removeItem('nexus_demo'); } catch (_) {}
    navigate('/auth', { replace: true });
  }, [navigate]);

  /**
   * 프로필 부분 업데이트 — 원본 setupProfileAndAuth() 의 profile-save 핸들러를 메서드화.
   * - 데모 모드: Supabase 호출 없이 로컬 state 와 localStorage 만 갱신
   * - 로그인 모드: profiles 테이블 update 후 로컬 state 동기화
   *
   * 원본 거동 유지를 위해 phone/status_msg 는 localStorage 에도 미러링한다.
   * 호출자(ProfileModal)는 { ok, error? } 형태의 결과를 받는다.
   */
const updateProfile = useCallback(async (updates) => {
    // 빈 객체/undefined 방어
    const clean = {};
    if (typeof updates?.full_name === 'string') clean.full_name = updates.full_name.trim();
    if (typeof updates?.phone === 'string')     clean.phone     = updates.phone.trim();
    if (typeof updates?.status_msg === 'string') clean.status_msg = updates.status_msg.trim();
    if (typeof updates?.avatar_url === 'string') clean.avatar_url = updates.avatar_url;
    /* 생년월일/입사일 — 'YYYY-MM-DD' 문자열 또는 null */
    if (updates?.birth_date !== undefined) {
      clean.birth_date = updates.birth_date || null;
    }
    if (updates?.hire_date !== undefined) {
      clean.hire_date = updates.hire_date || null;
    }

    if (Object.keys(clean).length === 0) return { ok: false, error: '변경할 내용이 없습니다.' };

    // localStorage 미러 (원본과 동일)
    try {
      if (clean.phone !== undefined)      localStorage.setItem('nexus_user_phone', clean.phone);
      if (clean.status_msg !== undefined) localStorage.setItem('nexus_user_status', clean.status_msg);
    } catch (_) {}

    // 데모 모드 / 비로그인 — 로컬 state 만
    if (!user) {
      setProfile((prev) => ({ ...(prev || {}), ...clean }));
      return { ok: true, demo: true };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(clean)
        .eq('id', user.id);
      if (error) throw error;

      // 로컬 state 동기화
      setProfile((prev) => ({ ...(prev || {}), ...clean }));
      return { ok: true };
    } catch (e) {
      console.error('[Auth] updateProfile error:', e);
      return { ok: false, error: e.message || '프로필 저장 실패' };
    }
  }, [user]);

  const consumeNext = useCallback((fallback = '/') => {
    const usp = new URLSearchParams(location.search);
    const next = usp.get('next');
    const safe = next 
      && /^[\w./?=&%#-]+$/.test(next) 
      && !next.startsWith('//') 
      && !next.startsWith('http') 
      ? next : null;
    navigate(safe || fallback, { replace: true });
  }, [location.search, navigate]);

  const value = {
    session,
    user,
    profile,
    loading,
    isAuthenticated: !!session || isDemo(),
    isDemo: isDemo(),
    signOut,
    updateProfile,
    consumeNext,
    refreshProfile: () => user && loadProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 <AuthProvider> 내부에서만 사용 가능합니다.');
  return ctx;
}