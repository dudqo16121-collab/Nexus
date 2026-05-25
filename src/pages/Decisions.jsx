// pages/Decisions.jsx
// 의사결정 추적기 메인 페이지.

import { DecisionsProvider } from '../contexts/DecisionsContext';
import DecisionsStats from '../components/decisions/DecisionsStats';
import DecisionsHeader from '../components/decisions/DecisionsHeader';
import DecisionsList from '../components/decisions/DecisionsList';

export default function Decisions() {
  return (
    <DecisionsProvider>
      <section id="view-decisions" className="dt-page">
        <div className="dt-page-head">
          <h1>
            <i className="fa-solid fa-gavel" style={{ color: '#4361ee' }} />
            의사결정 추적기
          </h1>
          <p className="dt-page-tagline">
            모든 회의에서 나온 결정·액션·질문을 한곳에서 — 다시 묻기 전에 검색하세요
          </p>
        </div>

        <DecisionsStats />
        <DecisionsHeader />
        <DecisionsList />
      </section>
    </DecisionsProvider>
  );
}