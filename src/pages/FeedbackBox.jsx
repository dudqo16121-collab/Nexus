// pages/FeedbackBox.jsx
// 익명 피드백 박스 — 메인 페이지.
// 탭: 작성 / 둘러보기 / 내 글 / 펄스 / 인사이트(관리자)

import { useState, useEffect } from 'react';
import { useFeedback } from '../contexts/FeedbackContext';
import { usePulse } from '../contexts/PulseContext';
import FeedbackPageHeader from '../components/feedback/FeedbackPageHeader';
import FeedbackWriteCard from '../components/feedback/FeedbackWriteCard';
import FeedbackBrowseList from '../components/feedback/FeedbackBrowseList';
import FeedbackInsightsTab from '../components/feedback/FeedbackInsightsTab';
import PulseTab from '../components/feedback/PulseTab';

const TABS = [
  { id: 'write',    label: '작성하기', icon: 'fa-pen-to-square' },
  { id: 'browse',   label: '둘러보기', icon: 'fa-list' },
  { id: 'mine',     label: '내 글',   icon: 'fa-key' },
  { id: 'pulse',    label: '펄스 서베이', icon: 'fa-wave-square' },
  { id: 'insights', label: '인사이트', icon: 'fa-chart-line', adminOnly: true },
];

export default function FeedbackBox() {
  const [tab, setTab] = useState('browse');
  const { feedbacks, isAdmin, slaAlerts, checkNewResponses, loading } = useFeedback();
  const { pendingSurveys } = usePulse();

  useEffect(() => {
    if (loading) return;
    checkNewResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const myCount = feedbacks.filter((f) => {
    try {
      const raw = localStorage.getItem('nexus_feedback_tokens_v1');
      if (!raw) return false;
      const tokens = JSON.parse(raw);
      return Boolean(tokens[f.id]);
    } catch {
      return false;
    }
  }).length;

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);
  const pendingCount = slaAlerts.warning + slaAlerts.danger;

  return (
    <section id="view-feedback">
      <FeedbackPageHeader />

      <div className="fb-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`fb-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`fa-solid ${t.icon}`} /> {t.label}
            {t.id === 'mine' && myCount > 0 && (
              <span className="fb-tab-count">{myCount}</span>
            )}
            {t.id === 'pulse' && pendingSurveys.length > 0 && (
              <span className="fb-tab-badge">{pendingSurveys.length}</span>
            )}
            {t.id === 'insights' && pendingCount > 0 && (
              <span className="fb-tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="fb-tab-content">
        {tab === 'write'    && <FeedbackWriteCard onSubmitted={() => setTab('browse')} />}
        {tab === 'browse'   && <FeedbackBrowseList />}
        {tab === 'mine'     && <FeedbackBrowseList onlyMine />}
        {tab === 'pulse'    && <PulseTab />}
        {tab === 'insights' && isAdmin && (
          <FeedbackInsightsTab onSwitchToBrowse={() => setTab('browse')} />
        )}
      </div>
    </section>
  );
}