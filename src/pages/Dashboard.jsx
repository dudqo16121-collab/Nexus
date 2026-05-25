import { useAuth } from '../contexts/AuthContext';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import WidgetGrid       from '../components/dashboard/WidgetGrid';
import QuickLinks       from '../components/dashboard/QuickLinks';
import WeeklyPoll       from '../components/dashboard/WeeklyPoll';
import DashboardNotices from '../components/dashboard/DashboardNotices';
import DashboardProjects from '../components/dashboard/DashboardProjects';
import AttendanceCard   from '../components/dashboard/AttendanceCard';
import WeatherWidget    from '../components/dashboard/WeatherWidget';
import MiniCalendar     from '../components/dashboard/MiniCalendar';
import Celebrations     from '../components/dashboard/Celebrations';
import QuickMemo        from '../components/dashboard/QuickMemo';
import DashboardActivityFeed from '../components/dashboard/DashboardActivityFeed';
import DashboardBookmarks from '../components/dashboard/DashboardBookmarks';
import DashboardMeetings from '../components/dashboard/DashboardMeetings';

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div style={{ padding: '30px 40px' }}>
      <DashboardHeader />
      <WidgetGrid />

      <div className="layout-flex">
        {/* 좌측 (2/3) */}
        <div className="flex-left">
          <QuickLinks />
          <DashboardNotices />
          <DashboardProjects />
          <DashboardMeetings />
          <DashboardActivityFeed />
          <WeeklyPoll />
        </div>

        {/* 우측 (1/3) */}
        <div className="flex-right">
          <DashboardBookmarks />
          <AttendanceCard />
          <WeatherWidget />
          <MiniCalendar />
          <Celebrations />
          <QuickMemo />
        </div>
      </div>
    </div>
  );
}