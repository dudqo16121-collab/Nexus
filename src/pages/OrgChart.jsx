// pages/OrgChart.jsx
// 조직도 페이지 — 헤더 + 부서 사이드바 + 직원 그리드 + 상세 모달.

import OrgChartHeader from '../components/orgchart/OrgChartHeader';
import OrgChartSidebar from '../components/orgchart/OrgChartSidebar';
import OrgChartGrid from '../components/orgchart/OrgChartGrid';
import OrgChartDetailModal from '../components/orgchart/OrgChartDetailModal';

export default function OrgChart() {
  return (
    <section id="view-orgchart">
      <OrgChartHeader />
      <div className="org-layout">
        <OrgChartSidebar />
        <main className="org-main">
          <OrgChartGrid />
        </main>
      </div>
      <OrgChartDetailModal />
    </section>
  );
}