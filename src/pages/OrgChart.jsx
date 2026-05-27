// 조직도 페이지 — 코맨드 센터.

import { useOrgChart } from '../contexts/OrgChartContext';
import OrgChartHeader from '../components/orgchart/OrgChartHeader';
import OrgChartSidebar from '../components/orgchart/OrgChartSidebar';
import OrgChartGrid from '../components/orgchart/OrgChartGrid';
import OrgChartList from '../components/orgchart/OrgChartList';
import OrgChartTree from '../components/orgchart/OrgChartTree';
import OrgChartDetailModal from '../components/orgchart/OrgChartDetailModal';

export default function OrgChart() {
  const { viewMode } = useOrgChart();

  return (
    <section id="view-orgchart">
      <OrgChartHeader />
      <div className="org-layout">
        <OrgChartSidebar />
        <main className="org-main">
          {viewMode === 'list' && <OrgChartList />}
          {viewMode === 'tree' && <OrgChartTree />}
          {(!viewMode || viewMode === 'grid') && <OrgChartGrid />}
        </main>
      </div>
      <OrgChartDetailModal />
    </section>
  );
}