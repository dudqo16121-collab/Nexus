// components/feedback/FeedbackInsightsTab.jsx
// 관리자 인사이트 탭 — 6개 패널 그리드.

import InsightsKpi from './admin/InsightsKpi';
import CategoryDonut from './admin/CategoryDonut';
import SentimentTrend from './admin/SentimentTrend';
import KeywordCloud from './admin/KeywordCloud';
import DeptSignal from './admin/DeptSignal';
import ResponseQueue from './admin/ResponseQueue';

export default function FeedbackInsightsTab({ onSwitchToBrowse }) {
  return (
    <div className="fb-insights">
      <InsightsKpi />

      <div className="fb-insights-grid">
        {/* 카테고리 도넛 */}
        <section className="fb-panel">
          <header className="fb-panel-head">
            <h3><i className="fa-solid fa-chart-pie" style={{ color: '#8338ec' }} /> 카테고리 분포</h3>
            <span className="fb-panel-sub">어떤 주제가 많이 나왔나요?</span>
          </header>
          <div className="fb-panel-body">
            <CategoryDonut />
          </div>
        </section>

        {/* 감정 트렌드 */}
        <section className="fb-panel fb-panel-wide">
          <header className="fb-panel-head">
            <h3><i className="fa-solid fa-chart-line" style={{ color: '#4361ee' }} /> 감정 추세 (12주)</h3>
            <span className="fb-panel-sub">주별 긍정/제안/중립/부정 누적</span>
          </header>
          <div className="fb-panel-body">
            <SentimentTrend />
          </div>
        </section>

        {/* 응답 큐 */}
        <section className="fb-panel fb-panel-wide">
          <header className="fb-panel-head">
            <h3><i className="fa-solid fa-bell" style={{ color: '#f72585' }} /> 응답 대기 큐</h3>
            <span className="fb-panel-sub">우선 응답이 필요한 피드백</span>
          </header>
          <div className="fb-panel-body">
            <ResponseQueue onPick={onSwitchToBrowse} />
          </div>
        </section>

        {/* 부서별 신호 */}
        <section className="fb-panel">
          <header className="fb-panel-head">
            <h3><i className="fa-solid fa-users" style={{ color: '#06d6a0' }} /> 부서별 신호</h3>
            <span className="fb-panel-sub">익명성 보호 (N≥5)</span>
          </header>
          <div className="fb-panel-body">
            <DeptSignal />
          </div>
        </section>

        {/* 키워드 클라우드 */}
        <section className="fb-panel fb-panel-wide">
          <header className="fb-panel-head">
            <h3><i className="fa-solid fa-cloud" style={{ color: '#ffd166' }} /> 자주 등장한 키워드</h3>
            <span className="fb-panel-sub">클릭하면 해당 단어로 검색</span>
          </header>
          <div className="fb-panel-body">
            <KeywordCloud />
          </div>
        </section>
      </div>
    </div>
  );
}