// components/common/RouteErrorBoundary.jsx
// 라우트 경로가 바뀌면 자동으로 에러 상태가 리셋되는 ErrorBoundary 래퍼.
// 페이지 한 곳에서 터져도 다른 메뉴로 이동하면 깨끗하게.

import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

export default function RouteErrorBoundary({ children, scope }) {
  const location = useLocation();
  return (
    <ErrorBoundary
      scope={scope}
      resetKeys={[location.pathname]}
    >
      {children}
    </ErrorBoundary>
  );
}