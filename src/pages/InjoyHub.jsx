import HubHero from '../components/hub/HubHero';
import HubCheckinCard from '../components/hub/HubCheckinCard';
import HubAutoMissions from '../components/hub/HubAutoMissions';
import HubKudosWall from '../components/hub/HubKudosWall';
import HubKudosFeed from '../components/hub/HubKudosFeed';
import HubRanking from '../components/hub/HubRanking';
import HubMissions from '../components/hub/HubMissions';
import HubBadgeToast from '../components/hub/HubBadgeToast';
import HubSendKudosModal from '../components/hub/HubSendKudosModal';
import HubMissionEditorModal from '../components/hub/HubMissionEditorModal';
import HubCheckinModal from '../components/hub/HubCheckinModal';
import HubMarket from '../components/hub/HubMarket';

export default function InjoyHub() {
  return (
    <section id="view-injoyhub">
      <HubHero />
      <HubCheckinCard />
      <HubKudosWall />

      <div className="hub-grid">
        <div className="hub-col">
          <HubAutoMissions />
          <HubMissions />
        </div>
        <div className="hub-col">
          <HubRanking />
          <HubKudosFeed />
        </div>
      </div>

      <section style={{ padding: '24px 28px' }}>
        <HubMarket />
      </section>

      <HubSendKudosModal />
      <HubMissionEditorModal />
      <HubCheckinModal />
      <HubBadgeToast />
    </section>
  );
}