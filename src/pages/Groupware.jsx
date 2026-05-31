import GroupwareHeader from '../components/groupware/GroupwareHeader';
import Hero            from '../components/groupware/Hero';
import GroupwareGrid   from '../components/groupware/GroupwareGrid';
import QuickToolbar    from '../components/groupware/QuickToolbar';
import StickyBoard     from '../components/groupware/StickyBoard';
import HubSendKudosModal    from '../components/hub/HubSendKudosModal';
import StandupEditorModal   from '../components/groupware/StandupEditorModal';
import CoWorkCreateModal    from '../components/groupware/CoWorkCreateModal';
import CoWorkRetroModal     from '../components/groupware/CoWorkRetroModal';
import AskCreateModal       from '../components/groupware/AskCreateModal';
import AskResolveModal      from '../components/groupware/AskResolveModal';
import IdeaCreateModal      from '../components/groupware/IdeaCreateModal';

export default function Groupware() {
  return (
    <div style={{ 
      padding: '30px 40px',
      boxSizing: 'border-box',
      width: '100%',
      overflowX: 'hidden',
    }}>
      <GroupwareHeader />
      <Hero />

      {/* 드래그/리사이즈 가능한 그리드 */}
      <GroupwareGrid />

      <QuickToolbar />
      <StickyBoard />
      <HubSendKudosModal />
      <StandupEditorModal />
      <CoWorkCreateModal />
      <CoWorkRetroModal />
      <AskCreateModal />
      <AskResolveModal />
      <IdeaCreateModal />
    </div>
  );
}