// components/admin/AdminTabs.jsx
// 관리자 페이지 탭 네비게이션 — 원본 admin-tabs 이관.
// 자산/환경설정 탭은 원본에 실제 기능이 없어 제외 (4개 탭만).

const TABS = [
  { id: 'attendance', label: '근태/업무 통계' },
  { id: 'notices',    label: '공지/팝업 관리' },
  { id: 'events',     label: '이달의 소식' },
  { id: 'polls',      label: '사내 투표' },
  { id: 'rooms', label: '회의실 관리' },
  { id: 'monitoring', label: '시스템 모니터링' },
];

export default function AdminTabs({ activeTab, onChange }) {
  return (
    <div
      className="admin-tabs"
      style={{
        display: 'flex',
        gap: 10,
        borderBottom: '1px solid var(--border-color)',
        marginBottom: 25,
        overflowX: 'auto',
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export { TABS };