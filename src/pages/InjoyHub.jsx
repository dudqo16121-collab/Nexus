// pages/InjoyHub.jsx
// INJOY Hub — 사내 칭찬·동기부여 플랫폼.

import HubHero from '../components/hub/HubHero';
import HubKudosFeed from '../components/hub/HubKudosFeed';
import HubRanking from '../components/hub/HubRanking';
import HubMissions from '../components/hub/HubMissions';
import HubSendKudosModal from '../components/hub/HubSendKudosModal';
import HubMissionEditorModal from '../components/hub/HubMissionEditorModal';
import HubMarket from '../components/hub/HubMarket';

export default function InjoyHub() {
  return (
    <section id="view-injoyhub">
      <HubHero />

      <div className="hub-grid">
        <div className="hub-col">
          <HubMissions />
          <HubKudosFeed />
        </div>
        <div className="hub-col">
          <HubRanking />
        </div>
      </div>
<section style={{ padding: '24px 28px' }}>
  <HubMarket />
  </section>
      <HubSendKudosModal />
      <HubMissionEditorModal />
    </section>
    
  );
}