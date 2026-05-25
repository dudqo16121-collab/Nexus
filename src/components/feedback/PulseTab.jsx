// components/feedback/PulseTab.jsx
// 피드백 페이지의 펄스 서베이 탭.

import { useState } from 'react';
import { usePulse } from '../../contexts/PulseContext';
import PulseSurveyList from '../pulse/PulseSurveyList';
import PulseAdminList from '../pulse/admin/PulseAdminList';

export default function PulseTab() {
  const { isAdmin } = usePulse();
  const [adminMode, setAdminMode] = useState(false);

  return (
    <div className="ps-tab">
      {isAdmin && (
        <div className="ps-tab-toggle">
          <button
            type="button"
            className={!adminMode ? 'active' : ''}
            onClick={() => setAdminMode(false)}
          >
            <i className="fa-solid fa-list" /> 응답자 화면
          </button>
          <button
            type="button"
            className={adminMode ? 'active' : ''}
            onClick={() => setAdminMode(true)}
          >
            <i className="fa-solid fa-gear" /> 관리자 화면
          </button>
        </div>
      )}

      {adminMode && isAdmin ? <PulseAdminList /> : <PulseSurveyList />}
    </div>
  );
}