// components/meeting/parts/PostDecisionsSummary.jsx
// Post 단계의 결정/액션 정리된 목록 — 타입별 그룹핑 + 칸반 변환 버튼.

import { useState } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DECISION_TYPES, getDecisionTypeMeta } from '../../../config/meetingCanvasConfig';
import DecisionCard from './DecisionCard';
import ConvertToTasksModal from './ConvertToTasksModal';

export default function PostDecisionsSummary() {
  const { user } = useAuth();
  const { current } = useMeetingCanvas();
  const [convertOpen, setConvertOpen] = useState(false);

  if (!current) return null;
  const { canvas, decisions } = current;
  const isHost = canvas.host_id === user?.id;

  /* 타입별로 그룹화 */
  const grouped = decisions.reduce((acc, d) => {
    if (!acc[d.type]) acc[d.type] = [];
    acc[d.type].push(d);
    return acc;
  }, {});

  /* 변환 가능한 액션 — task_id 없고 resolved 아닌 것 */
  const convertibleActions = (grouped.action || []).filter(
    (a) => !a.task_id && !a.resolved
  );
  const convertedCount = (grouped.action || []).filter((a) => a.task_id).length;
  const totalActions = (grouped.action || []).length;

  if (decisions.length === 0) {
    return (
      <section className="mc-post-decisions">
        <div className="mc-empty-hint">
          <i className="fa-regular fa-clipboard" />
          <p>회의에서 기록된 결정이나 액션이 없어요</p>
          <small>회의 중 단계에서 우측 패널에 결정사항을 기록하세요</small>
        </div>
      </section>
    );
  }

  return (
    <section className="mc-post-decisions">
      <div className="mc-section-head">
        <h3>
          <i className="fa-solid fa-clipboard-check" style={{ color: '#4361ee' }} />
          정리된 결정 / 액션
        </h3>
        <div className="mc-section-meta">
          <span>{decisions.length}건</span>
        </div>
      </div>

      {/* 칸반 변환 배너 */}
      {totalActions > 0 && (
        <div className="mc-convert-banner">
          <div className="mc-convert-banner-info">
            <div className="mc-convert-banner-icon">
              <i className="fa-solid fa-bolt" />
            </div>
            <div>
              <strong>
                액션 아이템 {convertibleActions.length > 0 ? `${convertibleActions.length}건` : '0건'}
                {convertedCount > 0 && (
                  <span className="mc-convert-converted-count">
                    · 이미 변환됨 {convertedCount}건
                  </span>
                )}
              </strong>
              <p>
                {convertibleActions.length > 0
                  ? '액션을 칸반 카드로 변환해서 실제 일감으로 만드세요'
                  : '모든 액션이 처리되었어요 ✨'}
              </p>
            </div>
          </div>
          {convertibleActions.length > 0 && isHost && (
            <button
              type="button"
              className="mc-convert-btn"
              onClick={() => setConvertOpen(true)}
            >
              <i className="fa-solid fa-rocket" /> 칸반 카드로 변환
            </button>
          )}
        </div>
      )}

      {/* 타입별 그룹 */}
      <div className="mc-post-groups">
        {DECISION_TYPES.map((t) => {
          const items = grouped[t.value] || [];
          if (items.length === 0) return null;
          return (
            <div key={t.value} className="mc-post-group">
              <div className="mc-post-group-head" style={{ borderLeftColor: t.color }}>
                <span className="mc-post-group-title" style={{ color: t.color }}>
                  <i className={`fa-solid ${t.icon}`} /> {t.label}
                </span>
                <span className="mc-post-group-count">{items.length}건</span>
              </div>
              <div className="mc-post-group-list">
                {items.map((d) => <DecisionCard key={d.id} decision={d} />)}
              </div>
            </div>
          );
        })}
      </div>

      <ConvertToTasksModal
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
        actions={convertibleActions}
      />
    </section>
  );
}