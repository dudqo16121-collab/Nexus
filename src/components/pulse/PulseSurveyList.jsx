// components/pulse/PulseSurveyList.jsx
// 직원 화면 — 진행 중/응답 완료/지난 설문 목록.

import { useState } from 'react';
import { usePulse } from '../../contexts/PulseContext';
import { getStatusMeta } from '../../config/pulseTypes';
import PulseSurveyRespond from './PulseSurveyRespond';
import PulseSurveyResults from './PulseSurveyResults';

export default function PulseSurveyList() {
  const { surveys, loading, error, isResponded, isAdmin } = usePulse();
  const [respondTarget, setRespondTarget] = useState(null);
  const [resultsTarget, setResultsTarget] = useState(null);

  if (loading) {
    return (
      <div className="ps-empty">
        <i className="fa-solid fa-spinner fa-spin" />
        <p>불러오는 중...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="ps-empty ps-empty-error">
        <i className="fa-solid fa-triangle-exclamation" />
        <p>에러: {error}</p>
      </div>
    );
  }

  const now = Date.now();
  const grouped = { active: [], closed: [], draft: [] };
  surveys.forEach((s) => {
    if (s.status === 'archived') return;
    if (s.status === 'draft') {
      if (isAdmin) grouped.draft.push(s); // 관리자만 초안 봄
      return;
    }
    const ended = new Date(s.end_at).getTime() < now;
    if (s.status === 'active' && !ended) grouped.active.push(s);
    else grouped.closed.push(s);
  });

  const Section = ({ title, items, emptyMsg }) => {
    if (items.length === 0 && !emptyMsg) return null;
    return (
      <section className="ps-section">
        <h3 className="ps-section-title">{title}</h3>
        {items.length === 0 ? (
          <div className="ps-empty-small">{emptyMsg}</div>
        ) : (
          <div className="ps-card-grid">
            {items.map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                responded={isResponded(s.id)}
                onRespond={() => setRespondTarget(s)}
                onResults={() => setResultsTarget(s)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="ps-list">
      <Section
        title="📋 진행 중인 설문"
        items={grouped.active}
        emptyMsg="현재 진행 중인 설문이 없어요"
      />
      <Section title="✅ 종료된 설문" items={grouped.closed} />
      {isAdmin && <Section title="📝 초안 (관리자만)" items={grouped.draft} />}

      {respondTarget && (
        <PulseSurveyRespond
          survey={respondTarget}
          onClose={() => setRespondTarget(null)}
          onDone={() => setRespondTarget(null)}
        />
      )}
      {resultsTarget && (
        <PulseSurveyResults
          survey={resultsTarget}
          onClose={() => setResultsTarget(null)}
        />
      )}
    </div>
  );
}

function SurveyCard({ survey, responded, onRespond, onResults, isAdmin }) {
  const stat = getStatusMeta(survey.status);
  const now = Date.now();
  const ended = new Date(survey.end_at).getTime() < now;
  const isActive = survey.status === 'active' && !ended;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(survey.end_at).getTime() - now) / 86400_000)
  );
  const qCount = (survey.questions || []).length;

  return (
    <article className={`ps-card ${responded ? 'responded' : ''}`}>
      <div className="ps-card-head">
        <span
          className="ps-status-badge"
          style={{ background: `${stat.color}22`, color: stat.color }}
        >
          {stat.label}
        </span>
        {isActive && daysLeft > 0 && (
          <span className="ps-card-deadline">D-{daysLeft}</span>
        )}
        {responded && (
          <span className="ps-responded-badge">
            <i className="fa-solid fa-check" /> 응답 완료
          </span>
        )}
      </div>

      <h4 className="ps-card-title">{survey.title}</h4>
      {survey.description && (
        <p className="ps-card-desc">{survey.description}</p>
      )}

      <div className="ps-card-meta">
        <span><i className="fa-solid fa-circle-question" /> 질문 {qCount}개</span>
        <span><i className="fa-solid fa-users" /> 응답 {survey.response_count || 0}건</span>
      </div>

      <div className="ps-card-actions">
        {isActive && !responded && (
          <button type="button" className="ps-btn-primary" onClick={onRespond}>
            <i className="fa-solid fa-pen" /> 응답하기
          </button>
        )}
        {(responded || isAdmin || !isActive) && (
          <button type="button" className="ps-btn-ghost" onClick={onResults}>
            <i className="fa-solid fa-chart-simple" /> 결과 보기
          </button>
        )}
      </div>
    </article>
  );
}