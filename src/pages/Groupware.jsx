import GroupwareHeader from '../components/groupware/GroupwareHeader';
import Hero            from '../components/groupware/Hero';
import ActionCenter    from '../components/groupware/ActionCenter';
import TeamPresence    from '../components/groupware/TeamPresence';
import ActivityStream  from '../components/groupware/ActivityStream';
import CoDocs          from '../components/groupware/CoDocs';
import QuickToolbar    from '../components/groupware/QuickToolbar';
import StickyBoard     from '../components/groupware/StickyBoard';

export default function Groupware() {
  return (
    <div style={{ padding: '30px 40px' }}>
      <GroupwareHeader />
      <Hero />

      <div className="bento-grid">
        <ActionCenter />
        <TeamPresence />
        <ActivityStream />
        <CoDocs />
      </div>

      <QuickToolbar />

      {/* 화면 위 떠다니는 스티커 메모 */}
      <StickyBoard />
    </div>
  );
}