// 대시보드 사내 투표 위젯 — 활성 투표 표시 + 응답.

import { useState, useEffect } from 'react';
import { usePoll } from '../../contexts/PollContext';
import { useToast } from '../../contexts/ToastContext';

export default function WeeklyPoll() {
  const { activePoll, myVotesMap, tallyMap, castVote, loading } = usePoll();
  const toast = useToast();

  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  /* 활성 투표 바뀌면 선택 초기화 */
  useEffect(() => {
    if (activePoll) {
      setSelectedIds(myVotesMap[activePoll.id] || []);
    } else {
      setSelectedIds([]);
    }
  }, [activePoll, myVotesMap]);

  if (loading && !activePoll) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>
            <i className="fa-solid fa-square-poll-vertical" style={{ color: 'var(--primary-color)', marginRight: 8 }} />
            이번 주 사내 투표
          </h2>
        </div>
        <p style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
          불러오는 중...
        </p>
      </section>
    );
  }

  if (!activePoll) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>
            <i className="fa-solid fa-square-poll-vertical" style={{ color: 'var(--primary-color)', marginRight: 8 }} />
            이번 주 사내 투표
          </h2>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <i className="fa-regular fa-square-poll-vertical" style={{ fontSize: '2rem', display: 'block', marginBottom: 10, opacity: 0.4 }} />
          <p style={{ fontSize: '0.9rem', margin: 0 }}>진행 중인 투표가 없어요</p>
        </div>
      </section>
    );
  }

  const tally = tallyMap[activePoll.id] || { totalVoters: 0, byOption: {} };
  const total = tally.totalVoters;
  const hasVoted = (myVotesMap[activePoll.id] || []).length > 0;
  const multi = activePoll.multi_select;

  const toggle = (optId) => {
    if (multi) {
      setSelectedIds((prev) =>
        prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
      );
    } else {
      setSelectedIds([optId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.warning('하나 이상 선택해주세요');
      return;
    }
    setSubmitting(true);
    const res = await castVote(activePoll.id, selectedIds);
    setSubmitting(false);
    if (res.ok) toast.success(hasVoted ? '투표를 변경했어요' : '투표 완료!');
    else toast.error(res.error);
  };

  return (
    <section className="panel">
      <div className="panel-header" style={{ marginBottom: 15 }}>
        <h2>
          <i className="fa-solid fa-square-poll-vertical" style={{ color: 'var(--primary-color)', marginRight: 8 }} />
          이번 주 사내 투표
        </h2>
        <span className="poll-status-badge">
          {multi ? '복수선택' : '단일선택'} · 진행중
        </span>
      </div>

      <p className="poll-question">{activePoll.title}</p>
      {activePoll.description && (
        <p className="poll-desc">{activePoll.description}</p>
      )}

      <div className="poll-container">
        {(activePoll.options || []).map((opt) => {
          const count = tally.byOption[opt.id] || 0;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const isSelected = selectedIds.includes(opt.id);
          const wasMyChoice = (myVotesMap[activePoll.id] || []).includes(opt.id);

          return (
            <div
              key={opt.id}
              className={`poll-option ${isSelected ? 'selected' : ''} ${wasMyChoice ? 'my-choice' : ''}`}
              onClick={() => toggle(opt.id)}
            >
              <div className="poll-bg" style={{ width: `${percent}%` }} />
              <span className="poll-text">
                {multi && (
                  <span className={`poll-check ${isSelected ? 'on' : ''}`}>
                    <i className={`fa-${isSelected ? 'solid' : 'regular'} fa-square-check`} />
                  </span>
                )}
                {opt.emoji && <span className="poll-emoji">{opt.emoji}</span>}
                <span className="poll-label">{opt.text}</span>
                {opt.desc && <span className="poll-sublabel">— {opt.desc}</span>}
              </span>
              <span className="poll-percent">
                {percent}% <span className="poll-count">({count})</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="poll-footer">
        <span className="poll-total">
          <i className="fa-solid fa-users" /> {total}명 참여
        </span>
        <button
          type="button"
          className="poll-submit"
          onClick={handleSubmit}
          disabled={submitting || selectedIds.length === 0}
        >
          {submitting ? '제출 중...' : hasVoted ? '투표 변경' : '투표하기'}
        </button>
      </div>
    </section>
  );
}