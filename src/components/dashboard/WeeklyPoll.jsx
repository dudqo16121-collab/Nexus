import { useState } from 'react';

const INITIAL_POLLS = [
  { id: 1, text: '🎬 단체 영화 관람 (오후 반차)',       votes: 45 },
  { id: 2, text: '🍖 팀별 회식 (회식비 1.5배 지원)',     votes: 82 },
  { id: 3, text: '🎯 방탈출 / 볼링 등 실내 액티비티',  votes: 12 },
];

export default function WeeklyPoll() {
  const [polls] = useState(INITIAL_POLLS);
  const [voted, setVoted] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const total = polls.reduce((sum, p) => sum + p.votes, 0);

  const handleVote = (id) => {
    if (voted) return;
    setSelectedId(id);
    setVoted(true);
  };

  return (
    <section className="panel">
      <div className="panel-header" style={{ marginBottom: 15 }}>
        <h2>
          <i className="fa-solid fa-square-poll-vertical" style={{ color: 'var(--primary-color)', marginRight: 8 }}></i>
          이번 주 사내 투표
        </h2>
        <span style={{
          fontSize: '0.8rem',
          background: 'rgba(255, 159, 28, 0.1)',
          color: 'var(--warning)',
          padding: '4px 8px',
          borderRadius: 6,
          fontWeight: 700,
        }}>진행중</span>
      </div>
      <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 15, color: 'var(--text-main)' }}>
        Q. 다음 달 사내 문화 행사로 가장 선호하는 활동은?
      </p>

      <div className={`poll-container ${voted ? 'voted' : ''}`}>
        {polls.map((poll) => {
          const percent = total > 0 ? Math.round((poll.votes / total) * 100) : 0;
          return (
            <div
              key={poll.id}
              className={`poll-option ${selectedId === poll.id ? 'selected' : ''}`}
              onClick={() => handleVote(poll.id)}
            >
              <div className="poll-bg" style={{ width: voted ? `${percent}%` : '0%' }}></div>
              <span className="poll-text">{poll.text}</span>
              <span className="poll-percent">{percent}%</span>
            </div>
          );
        })}
      </div>
      <p style={{
        textAlign: 'right',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        marginTop: 10,
      }}>
        현재 {total}명 참여 중
      </p>
    </section>
  );
}