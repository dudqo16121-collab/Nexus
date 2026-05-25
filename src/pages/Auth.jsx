// pages/Auth.jsx
// vanilla auth.html 의 모든 기능을 React 로 이관.
//
// 기능:
//  - 로그인 / 회원가입 모드 전환
//  - 아이디 저장 / 비밀번호 저장 (localStorage)
//  - 이메일 인증 미완료 사용자 차단
//  - 중복 이메일 안내, 인증 메일 발송 안내
//  - 다크모드 자동 대응 (CSS 변수 활용)
//  - useToast / useAuth 기반 (자체 토스트 제거)

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

/* localStorage 키 — vanilla 원본과 동일 키 유지 (마이그레이션 이후에도 사용자 설정 보존) */
const STORAGE_KEYS = {
  email: 'nexus_saved_email',
  password: 'nexus_saved_password',
  rememberEmail: 'nexus_remember_email',
  rememberPassword: 'nexus_remember_password',
};

export default function Auth() {
  const toast = useToast();
  const { consumeNext } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /* 페이지 로드 시 — 저장된 자격증명 복원 */
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_KEYS.email);
    const savedPassword = localStorage.getItem(STORAGE_KEYS.password);
    const remEmail = localStorage.getItem(STORAGE_KEYS.rememberEmail) === 'true';
    const remPassword = localStorage.getItem(STORAGE_KEYS.rememberPassword) === 'true';

    if (remEmail && savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
    if (remPassword && savedPassword) {
      setPassword(savedPassword);
      setRememberPassword(true);
    }
  }, []);

  /* 비밀번호 저장은 이메일 저장이 전제 — 체크박스 연동 */
  const handleRememberPasswordToggle = (checked) => {
    setRememberPassword(checked);
    if (checked) setRememberEmail(true);
  };
  const handleRememberEmailToggle = (checked) => {
    setRememberEmail(checked);
    if (!checked) setRememberPassword(false);
  };

  /* 모드 전환 */
  const toggleMode = () => setIsLogin((v) => !v);

  /* 자격증명 저장/제거 */
  const persistCredentials = () => {
    if (rememberEmail) {
      localStorage.setItem(STORAGE_KEYS.email, email);
      localStorage.setItem(STORAGE_KEYS.rememberEmail, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.email);
      localStorage.removeItem(STORAGE_KEYS.rememberEmail);
    }

    if (rememberPassword) {
      localStorage.setItem(STORAGE_KEYS.password, password);
      localStorage.setItem(STORAGE_KEYS.rememberPassword, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.password);
      localStorage.removeItem(STORAGE_KEYS.rememberPassword);
    }
  };

  /* 제출 */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isLogin) {
        /* ── 로그인 ── */
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error('유효하지 않은 아이디 또는 비밀번호입니다');
          return;
        }

        /* 이메일 인증 체크 */
        if (data.user && data.user.email_confirmed_at === null) {
          toast.error('이메일 인증이 필요합니다.');
          await supabase.auth.signOut();
          return;
        }

        persistCredentials();

        /* 로그인 성공 — ?next= 파라미터로 복귀하거나 / 로 */
        if (typeof consumeNext === 'function') {
          consumeNext('/');
        } else {
          window.location.href = '/';
        }
      } else {
        /* ── 회원가입 ── */
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          if (
            error.message?.includes('already registered') ||
            error.status === 422
          ) {
            toast.error('중복된 이메일입니다. 다시 확인해 주세요.');
          } else {
            toast.error(`회원가입 실패: ${error.message}`);
          }
          return;
        }

        /* Supabase 특성: identities 가 비어있으면 사실상 중복 가입 */
        if (
          data.user &&
          data.session === null &&
          data.user.identities &&
          data.user.identities.length === 0
        ) {
          toast.error('이미 가입된 이메일입니다. 다시 확인해 주세요.');
        } else {
          toast.success('인증 메일이 발송되었습니다!');
          /* 회원가입 직후 로그인 모드로 자동 전환 */
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error('[Auth] submit error:', err);
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* 좌측 데코 패널 — 회사 브랜딩 */}
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-logo">
            <i className="fa-solid fa-cube" />
            <span>NEXUS</span>
          </div>
          <h1 className="auth-tagline">
            연결된 일터,<br />
            완성된 그룹웨어.
          </h1>
          <p className="auth-sub">
            결재·일정·메신저·자료실까지 하나로.<br />
            팀의 모든 협업을 NEXUS 에서.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <i className="fa-solid fa-bolt" />
              <span>빠른 결재 흐름</span>
            </div>
            <div className="auth-feature">
              <i className="fa-solid fa-shield-halved" />
              <span>안전한 권한 관리</span>
            </div>
            <div className="auth-feature">
              <i className="fa-solid fa-comments" />
              <span>실시간 협업</span>
            </div>
          </div>
        </div>
      </div>

      {/* 우측 카드 */}
      <div className="auth-form-wrap">
        <div className="auth-card">
          <h2 className="auth-title">
            NEXUS {isLogin ? '로그인' : '회원가입'}
          </h2>
          <p className="auth-subtitle">
            {isLogin
              ? '계정 정보를 입력하고 시작하세요.'
              : '새 계정을 만들어 NEXUS 에 합류하세요.'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="auth-email">이메일</label>
              <div className="auth-input-wrap">
                <i className="fa-solid fa-envelope auth-input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">비밀번호</label>
              <div className="auth-input-wrap">
                <i className="fa-solid fa-lock auth-input-icon" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            {/* 로그인 모드에만 — 아이디/비밀번호 저장 옵션 */}
            {isLogin && (
              <div className="auth-remember-row">
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => handleRememberEmailToggle(e.target.checked)}
                  />
                  <span>아이디 저장</span>
                </label>
                <label className="auth-check">
                  <input
                    type="checkbox"
                    checked={rememberPassword}
                    onChange={(e) => handleRememberPasswordToggle(e.target.checked)}
                  />
                  <span>비밀번호 저장</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  처리 중...
                </>
              ) : isLogin ? (
                <>
                  <i className="fa-solid fa-right-to-bracket" />
                  로그인
                </>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus" />
                  회원가입
                </>
              )}
            </button>
          </form>

          <div className="auth-toggle">
            {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            <button type="button" onClick={toggleMode} disabled={loading}>
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </div>

          <div className="auth-foot">
            <i className="fa-solid fa-circle-info" />
            가입 후 발송되는 인증 메일을 확인해주세요.
          </div>
        </div>
      </div>
    </div>
  );
}