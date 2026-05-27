// 관리자 - 사내 투표 관리 탭.

import { useState } from 'react';
import { usePoll } from '../../contexts/PollContext';
import { useToast } from '../../contexts/ToastContext';
import AdminPollEditModal from './AdminPollEditModal';
import AdminPollVotersModal from './AdminPollVotersModal';

const STATUS_META = {
  draft:  { label: '임시저장', color: '#94a3b8', icon: 'fa-pen' },
  active: { label: '진행중',   color: '#06d6a0', icon: 'fa-circle-play' },
  closed: { label: '종료',     color: '#64748b', icon: 'fa-circle-stop' },
};

export default function AdminPollsTab() {
  const { polls, tallyMap, deletePoll, setPollStatus } = usePoll();
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [votersOpen, setVotersOpen] = useState(false);
  const [votersPoll, setVotersPoll] = useState(null);

  const handleNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const handleEdit = (poll) => {
    setEditing(poll);
    setEditOpen(true);
  };
  const handleViewVoters = (poll) => {
    setVotersPoll(poll);
    setVotersOpen(true);
  };

  const handleDelete = async (poll) => {
    if (!window.confirm(`"${poll.title}" 투표를 삭제할까요?\n응답 데이터도 함께 삭제됩니다.`)) return;
    const res = await deletePoll(poll.id);
    if (res.ok) toast.success('삭제했어요');
    else toast.error(res.error);
  };

  const handleStatus = async (poll, status) => {
    if (status === 'active') {
      const currentActive = polls.find((p) => p.status === 'active' && p.id !== poll.id);
      if (currentActive) {
        if (!window.confirm(
          `현재 진행 중인 투표 "${currentActive.title}"이(가) 있어요.\n` +
          `대시보드에는 하나만 표시됩니다. 그래도 활성화할까요?`
        )) return;
      }
    }
    const res = await setPollStatus(poll.id, status);
    if (res.ok) toast.success('상태 변경 완료');
    else toast.error(res.error);
  };

  return (
    <div className="admin-polls-tab">
      <div className="admin-polls-header">
        <div>
          <h3>사내 투표 관리</h3>
          <p>대시보드 "이번 주 사내 투표" 위젯에 표시되는 투표를 관리해요.</p>
        </div>
        <button type="button" className="btn btn-in" onClick={handleNew}>
          <i className="fa-solid fa-plus" /> 새 투표 만들기
        </button>
      </div>

      {polls.length === 0 ? (
        <div className="admin-polls-empty">
          <i className="fa-regular fa-square-poll-vertical" />
          <p>아직 등록된 투표가 없어요</p>
          <button type="button" className="btn btn-in" onClick={handleNew}>
            첫 투표 만들기
          </button>
        </div>
      ) : (
        <div className="admin-polls-grid">
          {polls.map((poll) => {
            const meta = STATUS_META[poll.status] || STATUS_META.draft;
            const tally = tallyMap[poll.id] || { totalVoters: 0 };
            return (
              <div key={poll.id} className="admin-poll-card">
                <div className="admin-poll-card-head">
                  <span
                    className="admin-poll-status"
                    style={{ background: `${meta.color}1a`, color: meta.color }}
                  >
                    <i className={`fa-solid ${meta.icon}`} /> {meta.label}
                  </span>
                  <span className="admin-poll-type">
                    {poll.multi_select ? '복수선택' : '단일선택'}
                  </span>
                </div>

                <h4 className="admin-poll-title">{poll.title}</h4>
                {poll.description && (
                  <p className="admin-poll-desc">{poll.description}</p>
                )}

                <ul className="admin-poll-options">
                  {(poll.options || []).slice(0, 5).map((opt) => (
                    <li key={opt.id}>
                      {opt.emoji && <span>{opt.emoji}</span>}
                      <span>{opt.text}</span>
                    </li>
                  ))}
                  {(poll.options || []).length > 5 && (
                    <li className="more">+{poll.options.length - 5}개 더</li>
                  )}
                </ul>

                <div className="admin-poll-card-foot">
                  <button
                    type="button"
                    className="admin-poll-stats clickable"
                    onClick={() => handleViewVoters(poll)}
                    title="참여자 명단 보기"
                    disabled={tally.totalVoters === 0}
                  >
                    <i className="fa-solid fa-users" /> {tally.totalVoters}명 참여
                    {tally.totalVoters > 0 && (
                      <i className="fa-solid fa-chevron-right" style={{ marginLeft: 4, fontSize: '0.7rem' }} />
                    )}
                  </button>
                  <div className="admin-poll-actions">
                    {poll.status !== 'active' && (
                      <button type="button" title="활성화" onClick={() => handleStatus(poll, 'active')}>
                        <i className="fa-solid fa-circle-play" />
                      </button>
                    )}
                    {poll.status === 'active' && (
                      <button type="button" title="종료" onClick={() => handleStatus(poll, 'closed')}>
                        <i className="fa-solid fa-circle-stop" />
                      </button>
                    )}
                    <button type="button" title="편집" onClick={() => handleEdit(poll)}>
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button type="button" title="삭제" className="danger" onClick={() => handleDelete(poll)}>
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminPollEditModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        poll={editing}
      />
      <AdminPollVotersModal
        isOpen={votersOpen}
        onClose={() => setVotersOpen(false)}
        poll={votersPoll}
      />
    </div>
  );
}