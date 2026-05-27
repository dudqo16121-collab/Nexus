import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/pages/feedback.css';
import './styles/pages/project.css';
import './styles/pages/wiki.css';
import './styles/pages/board.css';
import './styles/pages/approval.css';
import './styles/pages/wellbeing.css';
import './styles/pages/schedule.css';
import './styles/pages/mail.css';
import './styles/pages/training.css';
import './styles/pages/hub.css';
import './styles/pages/auth.css';
import './styles/pages/expenses.css';
import './styles/pages/orgchart.css';
import './styles/pages/admin.css';
import './styles/pages/meeting-room.css';
import './styles/pages/resources.css';
import './styles/pages/groupware.css';
import './styles/pages/codocs.css';
import './styles/pages/meeting.css';
import './styles/pages/decisions.css';
import './styles/components/contextWidget.css';
import './styles/components/projectSituation.css';
import './styles/components/dashboardMyProjects.css';
import './styles/components/activityFeedPanel.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);