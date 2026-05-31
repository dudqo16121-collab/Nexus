import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ErrorBoundary from './components/common/ErrorBoundary';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';
import RequireAuth from './components/common/RequireAuth';
import RequireAdmin from './components/common/RequireAdmin';
import Layout from './components/layout/Layout';
import ComingSoon from './components/common/ComingSoon';
import CommandPalette from './components/common/CommandPalette';
import NoticePopupDisplay from './components/common/NoticePopupDisplay';

// ─── Providers ────────────────────────────────
import { AuthProvider } from './contexts/AuthContext';
import { MessengerProvider } from './contexts/MessengerContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
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
import { KanbanProvider } from './contexts/KanbanContext';
import { OrgChartProvider } from './contexts/OrgChartContext';
import { MailProvider } from './contexts/MailContext';
import { TrainingProvider } from './contexts/TrainingContext';
import { HubProvider } from './contexts/HubContext';
import { WellbeingProvider } from './contexts/WellbeingContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { ActivityFeedProvider } from './contexts/ActivityFeedContext';
import { SearchProvider } from './contexts/SearchContext';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { SystemLogProvider } from './contexts/SystemLogContext';
import { NoticePopupProvider } from './contexts/NoticePopupContext';
import { PulseProvider } from './contexts/PulseContext';
import { MeetingCanvasProvider } from './contexts/MeetingCanvasContext';
import { CompanyEventsProvider } from './contexts/CompanyEventsContext';
import { ContextLinksProvider } from './contexts/ContextLinksContext';
import { PollProvider } from './contexts/PollContext';
import { GroupwareLayoutProvider } from './contexts/GroupwareLayoutContext';
import { StandupProvider } from './contexts/StandupContext';
import { CoWorkProvider } from './contexts/CoWorkContext';
import { AskProvider } from './contexts/AskContext';
import { IdeaProvider } from './contexts/IdeaContext';

// ─── 페이지 — lazy load (라우트별 코드 스플리팅) ───
const Auth                = lazy(() => import('./pages/Auth'));
const Dashboard           = lazy(() => import('./pages/Dashboard'));
const Groupware           = lazy(() => import('./pages/Groupware'));
const Approval            = lazy(() => import('./pages/Approval'));
const Schedule            = lazy(() => import('./pages/Schedule'));
const Board               = lazy(() => import('./pages/Board'));
const Expenses            = lazy(() => import('./pages/Expenses'));
const MeetingRoom         = lazy(() => import('./pages/MeetingRoom'));
const Admin               = lazy(() => import('./pages/Admin'));
const Resources           = lazy(() => import('./pages/Resources'));
const Project             = lazy(() => import('./pages/Project'));
const Wiki                = lazy(() => import('./pages/Wiki'));
const OrgChart            = lazy(() => import('./pages/OrgChart'));
const Mail                = lazy(() => import('./pages/Mail'));
const Training            = lazy(() => import('./pages/Training'));
const InjoyHub            = lazy(() => import('./pages/InjoyHub'));
const Wellbeing           = lazy(() => import('./pages/Wellbeing'));
const FeedbackBox         = lazy(() => import('./pages/FeedbackBox'));
const Bookmarks           = lazy(() => import('./pages/Bookmarks'));
const SystemLogs          = lazy(() => import('./pages/SystemLogs'));
const EmployeeManagement  = lazy(() => import('./pages/EmployeeManagement'));
const Meetings            = lazy(() => import('./pages/Meetings'));
const Decisions           = lazy(() => import('./pages/Decisions'));
const Leave               = lazy(() => import('./pages/Leave'));
const NotFound            = lazy(() => import('./pages/NotFound'));

/* 페이지 lazy load 시 보여줄 로딩 UI */
function PageLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-body, #f8f9fa)',
        zIndex: 9000,
      }}
    >
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: '2rem', color: 'var(--primary-color)' }}
        />
        <div style={{ marginTop: 12, fontSize: '0.9rem' }}>페이지 로딩 중...</div>
      </div>
    </div>
  );
}

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
                              <IdeaProvider>
                              <ScheduleProvider>
                                <OrgChartProvider>
                                  <BoardProvider>
                                    <ApprovalProvider>
                                      <LeaveProvider>
                                        <ExpenseProvider>
                                          <MeetingRoomProvider>
                                            <ContextLinksProvider>
                                              <MeetingCanvasProvider>
                                                <AdminProvider>
                                                  <PollProvider>
                                                    <ResourceProvider>
                                                      <ProjectProvider>
                                                        <MailProvider>
                                                          <TrainingProvider>
                                                            <HubProvider>
                                                              <AskProvider>
                                                              <WellbeingProvider>
                                                                <FeedbackProvider>
                                                                  <PulseProvider>
                                                                    <ActivityFeedProvider>
                                                                      <SearchProvider>
                                                                        <BookmarkProvider>
                                                                          <CompanyEventsProvider>
                                                                            <StandupProvider>
                                                                              <CoWorkProvider>
                                                                                <GroupwareLayoutProvider>
                                                                            <Suspense fallback={<PageLoading />}>
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
                                                                                  <Route path="/" element={<Dashboard />} />
                                                                                  <Route path="/leave" element={<Leave />} />
                                                                                  <Route path="/groupware" element={<Groupware />} />
                                                                                  <Route path="/approval" element={<Approval />} />
                                                                                  <Route path="/schedule" element={<Schedule />} />
                                                                                  <Route path="/board" element={<Board />} />
                                                                                  <Route path="/expenses" element={<Expenses />} />
                                                                                  <Route path="/meetingroom" element={<MeetingRoom />} />
                                                                                  <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
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
                                                                            </Suspense>
                                                                            <CommandPalette />
                                                                            </GroupwareLayoutProvider>
                                                                              </CoWorkProvider>
                                                                            </StandupProvider>
                                                                          </CompanyEventsProvider>
                                                                        </BookmarkProvider>
                                                                      </SearchProvider>
                                                                    </ActivityFeedProvider>
                                                                  </PulseProvider>
                                                                </FeedbackProvider>
                                                              </WellbeingProvider>
                                                              </AskProvider>
                                                            </HubProvider>
                                                          </TrainingProvider>
                                                        </MailProvider>
                                                      </ProjectProvider>
                                                    </ResourceProvider>
                                                  </PollProvider>
                                                </AdminProvider>
                                              </MeetingCanvasProvider>
                                            </ContextLinksProvider>
                                          </MeetingRoomProvider>
                                        </ExpenseProvider>
                                      </LeaveProvider>
                                    </ApprovalProvider>
                                  </BoardProvider>
                                </OrgChartProvider>
                              </ScheduleProvider>
                              </IdeaProvider>
                            </WikiProvider>
                          </TimerProvider>
                        </StickyProvider>
                      </ApiProvider>
                    </KanbanProvider>
                  </MessengerProvider>
                  <NoticePopupDisplay />
                </SystemLogProvider>
              </NoticePopupProvider>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}