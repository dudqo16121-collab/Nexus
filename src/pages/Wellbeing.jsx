// pages/Wellbeing.jsx
// Well-being 체크인 페이지 — 탭 4개 (체크인 / 전사 현황 / 내 기록 / 관리자).

import { useState } from 'react';
import { useWellbeing } from '../contexts/WellbeingContext';
import WellbeingCheckin from '../components/wellbeing/WellbeingCheckin';
import WellbeingOverview from '../components/wellbeing/WellbeingOverview';
import WellbeingHistory from '../components/wellbeing/WellbeingHistory';
import WellbeingAdmin from '../components/wellbeing/WellbeingAdmin';

const TABS = [
  { id: 'checkin',  label: '오늘 체크인', icon: 'fa-heart-pulse' },
  { id: 'overview', label: '전사 현황',   icon: 'fa-chart-line' },
  { id: 'history',  label: '내 기록',     icon: 'fa-clock-rotate-left' },
  { id: 'admin',    label: '관리자',     icon: 'fa-shield-halved', adminOnly: true },
];

export default function Wellbeing() {
  const [tab, setTab] = useState('checkin');
  const { isAdmin, alerts } = useWellbeing();

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <section id="view-wellbeing">
      <header className="wb-page-header">
        <div>
          <h1>
            <span className="wb-icon-box">
              <i className="fa-solid fa-heart-pulse" />
            </span>
            Well-being 체크인
          </h1>
          <p className="wb-page-tagline">
            오늘 하루 어떻게 보내고 있나요? 1분 체크인으로 나와 팀의 건강을 챙겨봐요.
          </p>
        </div>
      </header>

      <div className="wb-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`wb-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`fa-solid ${t.icon}`} /> {t.label}
            {t.id === 'admin' && alerts.length > 0 && (
              <span className="wb-tab-badge">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="wb-tab-content">
        {tab === 'checkin'  && <WellbeingCheckin />}
        {tab === 'overview' && <WellbeingOverview />}
        {tab === 'history'  && <WellbeingHistory />}
        {tab === 'admin' && isAdmin && <WellbeingAdmin />}
      </div>
    </section>
  );
}