// components/common/RequireAdmin.jsx
// 관리자 전용 라우트 가드 — RequireAuth 패턴을 그대로 따른다.
// 비관리자가 /admin URL 을 직접 입력했을 때 차단한다.
//
// 동작:
//  - 로그인/프로필 로딩 중 → LoadingScreen
//  - 미로그인 → /auth 로 (next 파라미터 보존)
//  - 로그인했지만 비관리자 → 대시보드로 리다이렉트
//  - 관리자 → children 렌더
//
// 주의: 이 가드는 클라이언트 측 UX 보호일 뿐이다. 실제 데이터 보호는
//       Supabase RLS 정책에서 보장해야 한다 (profiles.is_admin 기반).

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function RequireAdmin({ children }) {
  const { isAuthenticated, profile, loading } = useAuth();
  const location = useLocation();

  // 인증 상태 + 프로필 로딩 대기
  if (loading) return <LoadingScreen />;

  // 미로그인 → 로그인 페이지로 (원래 가려던 경로 보존)
  if (!isAuthenticated) {
    const next = location.pathname + location.search + location.hash;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }

  // 로그인했지만 관리자가 아니면 → 대시보드로
  if (profile?.is_admin !== true) {
    return <Navigate to="/" replace />;
  }

  return children;
}