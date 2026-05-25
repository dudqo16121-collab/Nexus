// components/decisions/DecisionsList.jsx
// 필터링된 결정/액션 목록.

import { useDecisions } from '../../contexts/DecisionsContext';
import DecisionRow from './DecisionRow';

export default function DecisionsList() {
  const { filtered, loading, error, search } = useDecisions();

  if (loading) {
    return (
      <div className="dt-empty">
        <i className="fa-solid fa-spinner fa-spin" />
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dt-empty">
        <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f72585' }} />
        <p>에러: {error}</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="dt-empty">
        <i className="fa-regular fa-clipboard" />
        <p>{search ? '검색 결과가 없어요' : '아직 기록된 결정/액션이 없어요'}</p>
        <small>회의 캔버스에서 결정이나 액션을 추가하면 여기에 모입니다</small>
      </div>
    );
  }

  return (
    <div className="dt-list">
      {filtered.map((row) => (
        <DecisionRow key={row.decision.id} row={row} />
      ))}
    </div>
  );
}