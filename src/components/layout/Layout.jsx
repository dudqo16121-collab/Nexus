// components/layout/Layout.jsx
// 보호된 라우트들의 공통 레이아웃 — Sidebar + Topbar + 페이지 (Outlet) + Messenger.
// 페이지 영역만 RouteErrorBoundary 로 감싸서 페이지 에러가 다른 부분까지
// 떨어뜨리지 않게 한다.

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Messenger from '../messenger/Messenger';
import RouteErrorBoundary from '../common/RouteErrorBoundary';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <main style={{ flex: 1, overflowX: 'hidden', minWidth: 0 }}>
          <RouteErrorBoundary scope="page">
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>

      {/* 메신저는 라우팅과 무관 — 절대 언마운트 X */}
      <Messenger />
    </div>
  );
}