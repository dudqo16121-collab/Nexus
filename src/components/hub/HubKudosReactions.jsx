// components/hub/HubKudosReactions.jsx
// 칭찬에 다는 이모지 반응 — 어디서든 재사용 가능한 작은 컴포넌트.

import { useHub, KUDOS_REACTIONS } from '../../contexts/HubContext';

export default function HubKudosReactions({ kudosId, compact = false }) {
  const { reactionsByKudos, toggleKudosReaction } = useHub();
  const { counts, mine, total } = reactionsByKudos(kudosId);

  const handleReact = async (emoji) => {
    await toggleKudosReaction(kudosId, emoji);
  };

  /* compact 모드 — 반응이 있는 것만 표시 */
  if (compact) {
    const activeReactions = KUDOS_REACTIONS.filter((r) => counts[r.id] > 0);
    if (activeReactions.length === 0 && !mine.size) return null;

    return (
      <div className="hub-kudos-reactions compact">
        {activeReactions.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`hub-kudos-reaction-chip ${mine.has(r.id) ? 'mine' : ''}`}
            onClick={() => handleReact(r.id)}
            title={r.label}
          >
            <span>{r.emoji}</span>
            <em>{counts[r.id]}</em>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="hub-kudos-reactions">
      {KUDOS_REACTIONS.map((r) => {
        const count = counts[r.id] || 0;
        const isMine = mine.has(r.id);
        return (
          <button
            key={r.id}
            type="button"
            className={`hub-kudos-reaction-btn ${isMine ? 'mine' : ''} ${count > 0 ? 'has-count' : ''}`}
            onClick={() => handleReact(r.id)}
            title={r.label}
          >
            <span className="hub-kudos-reaction-emoji">{r.emoji}</span>
            {count > 0 && <em className="hub-kudos-reaction-count">{count}</em>}
          </button>
        );
      })}
    </div>
  );
}