// pages/Admin.jsx
// 시스템 전체관리 페이지.
// 원본 index.html #admin-modal 을 페이지로 마이그레이션.
// (원본은 전체화면 모달이었으나, 다른 페이지들과의 일관성을 위해 페이지로 전환)

import { useState } from 'react';
import AdminTabs from '../components/admin/AdminTabs';
import AdminAttendanceTab from '../components/admin/AdminAttendanceTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminRoomsTab from '../components/admin/AdminRoomsTab';
import AdminMonitoringTab from '../components/admin/AdminMonitoringTab';
import AdminUserEditModal from '../components/admin/AdminUserEditModal';
import AdminNoticesTab from '../components/admin/AdminNoticesTab'
import AdminEventsTab from '../components/admin/AdminEventsTab';
import AdminPollsTab from '../components/admin/AdminPollsTab';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <section id="view-admin">
      <header
        style={{
          background: 'transparent',
          backdropFilter: 'none',
          position: 'relative',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            <i
              className="fa-solid fa-gears"
              style={{ color: 'var(--primary-color)', marginRight: 10 }}
            />
            시스템 전체관리
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            사내 근태·계정·회의실·시스템 현황을 한 곳에서 관리하세요.
          </span>
        </div>
      </header>

      <div className="panel">
        <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

{activeTab === 'attendance' && <AdminAttendanceTab />}
        {activeTab === 'notices' && <AdminNoticesTab />}
        {activeTab === 'events' && <AdminEventsTab />}
        {activeTab === 'polls' && <AdminPollsTab />}
        {activeTab === 'rooms' && <AdminRoomsTab />}
        {activeTab === 'monitoring' && <AdminMonitoringTab />}
      </div>

      <AdminUserEditModal />
    </section>
  );
}