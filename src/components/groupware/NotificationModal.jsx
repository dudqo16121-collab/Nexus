import { useState } from 'react';
import Modal from '../common/Modal';
import { useNotification } from '../../contexts/NotificationContext';

const TABS = [
  { id: 'all', label: '전체' },
  { id: 'mention', label: '멘션' },
  { id: 'approval', label: '결재' },
  { id: 'system', label: '시스템' },
];

export default function NotificationModal({ isOpen, onClose }) {
  const { items: notifications, markAsRead, markAllAsRead } = useNotification();
  const [activeTab, setActiveTab] = useState('all');

  /* 탭 필터링 */
  const filtered = activeTab === 'all'
    ? notifications
    : notifications.filter((n) => n.type === activeTab);

  const headerExtra = (
    <span
      onClick={markAllAsRead}
      style={{
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      모두 읽음
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <>
          <i className="fa-solid fa-bell" style={{ color: 'var(--warning)' }}></i>
          알림 센터
        </>
      }
      headerExtra={headerExtra}
    >
      {/* 탭 */}
      <div className="notif-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`notif-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div>
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
            알림이 없습니다.
          </p>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.unread ? 'unread' : ''}`}
              onClick={() => markAsRead(n.id)}
            >
              <div
                className="notif-icon"
                style={{ background: n.iconBg, color: n.iconColor }}
              >
                <i className={`fa-solid ${n.icon}`}></i>
              </div>
              <div className="notif-body" style={{ flex: 1 }}>
                <p dangerouslySetInnerHTML={{ __html: n.text }}></p>
                <span className="notif-time">{n.time}</span>
              </div>
              {n.unread && <div className="notif-badge"></div>}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}