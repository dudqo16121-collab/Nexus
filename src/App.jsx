import ErrorBoundary from './components/common/ErrorBoundary';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';
import { ProjectProvider } from './contexts/ProjectContext';
import { ResourceProvider } from './contexts/ResourceContext';
import { AdminProvider } from './contexts/AdminContext';
import { MeetingRoomProvider } from './contexts/MeetingRoomContext';
import { ExpenseProvider } from './contexts/ExpenseContext';
import { ApprovalProvider } from './contexts/ApprovalContext';
import { BoardProvider } from './contexts/BoardContext';
import { LeaveProvider } from './contexts/LeaveContext';
import { WikiProvider } from './contexts/WikiContext';
import { ScheduleProvider } from './contexts/ScheduleContext';
import { TimerProvider } from './contexts/TimerContext';
import { StickyProvider } from './contexts/StickyContext';
import { ApiProvider } from './contexts/ApiContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { KanbanProvider } from './contexts/KanbanContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MessengerProvider } from './contexts/MessengerContext';
import { ToastProvider } from './contexts/ToastContext';
import RequireAuth from './components/common/RequireAuth';
import Layout from './components/layout/Layout';
import RequireAdmin from './components/common/RequireAdmin';
import { OrgChartProvider } from './contexts/OrgChartContext';
import ComingSoon from './components/common/ComingSoon';
import { MailProvider } from './contexts/MailContext';
import { TrainingProvider } from './contexts/TrainingContext';
import { HubProvider } from './contexts/HubContext';
import { WellbeingProvider } from './contexts/WellbeingContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { ActivityFeedProvider } from './contexts/ActivityFeedContext';
import { SearchProvider } from './contexts/SearchContext';
import CommandPalette from './components/common/CommandPalette';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { SystemLogProvider } from './contexts/SystemLogContext';
import { NoticePopupProvider } from './contexts/NoticePopupContext';
import NoticePopupDisplay from './components/common/NoticePopupDisplay';
import { PulseProvider } from './contexts/PulseContext';
import { MeetingCanvasProvider } from './contexts/MeetingCanvasContext';
import { CompanyEventsProvider } from './contexts/CompanyEventsContext';

import Mail from './pages/Mail';
import Resources from './pages/Resources';
import Auth from './pages/Auth';
import Leave from './pages/Leave';
import Dashboard from './pages/Dashboard';
import Groupware from './pages/Groupware';
import Approval from './pages/Approval';
import Schedule from './pages/Schedule';
import NotFound from './pages/NotFound';
import Board from './pages/Board';
import Expenses from './pages/Expenses';
import MeetingRoom from './pages/MeetingRoom';
import Admin from './pages/Admin';
import Project from './pages/Project';
import Wiki from './pages/Wiki';
import OrgChart from './pages/OrgChart';
import Training from './pages/Training';
import InjoyHub from './pages/InjoyHub';
import Wellbeing from './pages/Wellbeing';
import FeedbackBox from './pages/FeedbackBox';
import Bookmarks from './pages/Bookmarks';
import SystemLogs from './pages/SystemLogs';
import EmployeeManagement from './pages/EmployeeManagement';
import Meetings from './pages/Meetings';
import Decisions from './pages/Decisions';

export default function App() {
  return (
    <ErrorBoundary scope="root">
    <BrowserRouter>
    <AuthProvider>
    <NotificationProvider>
    <ToastProvider>
          <NoticePopupProvider>
          <SystemLogProvider>
        <MessengerProvider>
          <KanbanProvider>
              <ApiProvider>
                <StickyProvider>
                  <TimerProvider>
                    <WikiProvider>
                      <ScheduleProvider>
                        <OrgChartProvider>
                      <BoardProvider>
                        <ApprovalProvider>
                          <LeaveProvider>
                            <ExpenseProvider>
                              <MeetingRoomProvider>
                                <MeetingCanvasProvider>
                                <AdminProvider>
                                  <ResourceProvider>
                                    <ProjectProvider>
                                      <MailProvider>
                                        <TrainingProvider>
                                          <HubProvider>
                                            <WellbeingProvider>
                                              <FeedbackProvider>
                                                <PulseProvider>
                                              <ActivityFeedProvider>
                                                <SearchProvider>
                                                  <BookmarkProvider>
                                                    <CompanyEventsProvider>
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/auth" element={<Auth />} />

            {/* 보호된 라우트 — 모두 Layout 공유 */}
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/leave" element={<Leave />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/groupware" element={<Groupware />} />
          <Route path="/approval" element={<Approval />}/>
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/board" element={<Board />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/meetingroom" element={<MeetingRoom />} />
              <Route path="/admin"element={<RequireAdmin><Admin /></RequireAdmin>}/>
              <Route path="/resource" element={<Resources />} />
              <Route path="/project" element={<Project />} />
              <Route path="/wiki" element={<Wiki />} />
              <Route path="/orgchart" element={<OrgChart />} />
              <Route path="/mail" element={<Mail />} />
              <Route path="/training" element={<Training />} />
              <Route path="/injoyhub" element={<InjoyHub />} />
              <Route path="/wellbeing" element={<Wellbeing />} />
              <Route path="/feedback" element={<FeedbackBox />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/admin/logs" element={<RequireAdmin><SystemLogs /></RequireAdmin>} />
              <Route path="/admin/orgchart" element={<RequireAdmin><EmployeeManagement /></RequireAdmin>} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/decisions" element={<Decisions />} />
            </Route>
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          </CompanyEventsProvider>
          </BookmarkProvider>
          <CommandPalette />
          </SearchProvider>
          </ActivityFeedProvider>
          </PulseProvider>
          </FeedbackProvider>
          </WellbeingProvider>
          </HubProvider>
          </TrainingProvider>
          </MailProvider>
          </ProjectProvider>
          </ResourceProvider>
          </AdminProvider>
          </MeetingCanvasProvider>
          </MeetingRoomProvider>
          </ExpenseProvider>
          </LeaveProvider>
                        </ApprovalProvider>
                      </BoardProvider>
                      </OrgChartProvider>
                      </ScheduleProvider>
                    </WikiProvider>
                  </TimerProvider>
                </StickyProvider>
              </ApiProvider>
          </KanbanProvider>
        </MessengerProvider>
        </SystemLogProvider>
        <NoticePopupDisplay />
        </NoticePopupProvider>
      </ToastProvider>
      </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}