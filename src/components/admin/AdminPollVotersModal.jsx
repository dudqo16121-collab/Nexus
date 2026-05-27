// 관리자 - 투표 참여자 명단 모달.
// 누가 어떤 옵션을 선택했는지 옵션별로 그룹핑해서 표시.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { supabase } from '../../lib/supabase';
import { useOrgChart } from '../../contexts/OrgChartContext';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminPollVotersModal({ isOpen, onClose, poll }) {
  const { members } = useOrgChart() || { members: [] };
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('byOption'); // 'byOption' | 'byUser'

  /* 투표 데이터 로드 */
  useEffect(() => {
    if (!isOpen || !poll?.id) {
      setVotes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('poll_votes')
          .select('*')
          .eq('poll_id', poll.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setVotes(data || []);
      } catch (e) {
        console.error('[AdminPollVoters] fetch:', e);
        if (!cancelled) setVotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, poll?.id]);

  const findMember = (id) => members.find((u) => u.id === id);

  if (!poll) return null;

  /* 옵션별로 그룹핑 */
  const byOption = {};
  (poll.options || []).forEach((opt) => {
    byOption[opt.id] = {
      option: opt,
      voters: [],
    };
  });
  votes.forEach((v) => {
    (v.option_ids || []).forEach((oid) => {
      if (byOption[oid]) {
        byOption[oid].voters.push({
          userId: v.user_id,
          votedAt: v.updated_at || v.created_at,
        });
      }
    });
  });

  /* CSV 내보내기 */
  const exportCsv = () => {
    const rows = [['이름', '부서', '직급', '선택한 옵션', '응답 일시']];
    votes.forEach((v) => {
      const u = findMember(v.user_id);
      const optionTexts = (v.option_ids || [])
        .map((oid) => {
          const opt = (poll.options || []).find((o) => o.id === oid);
          return opt ? `${opt.emoji || ''}${opt.text}` : oid;
        })
        .join(' | ');
      rows.push([
        u?.full_name || '알 수 없음',
        u?.department || '-',
        u?.position || '-',
        optionTexts,
        formatDateTime(v.updated_at || v.created_at),
      ]);
    });
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `투표_${poll.title}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="참여자 명단">
      <div className="poll-voters-modal">
        {/* 투표 제목 */}
        <div className="poll-voters-head">
          <h4>{poll.title}</h4>
          <p>총 {votes.length}명 참여</p>
        </div>

        {/* 뷰 모드 + 내보내기 */}
        <div className="poll-voters-toolbar">
          <div className="poll-voters-tabs">
            <button
              type="button"
              className={`poll-voters-tab ${viewMode === 'byOption' ? 'active' : ''}`}
              onClick={() => setViewMode('byOption')}
            >
              옵션별
            </button>
            <button
              type="button"
              className={`poll-voters-tab ${viewMode === 'byUser' ? 'active' : ''}`}
              onClick={() => setViewMode('byUser')}
            >
              사람별
            </button>
          </div>
          {votes.length > 0 && (
            <button type="button" className="poll-voters-csv" onClick={exportCsv}>
              <i className="fa-solid fa-download" /> CSV 내보내기
            </button>
          )}
        </div>

        {/* 본문 */}
        {loading ? (
          <div className="poll-voters-empty">
            <i className="fa-solid fa-spinner fa-spin" />
            <p>불러오는 중...</p>
          </div>
        ) : votes.length === 0 ? (
          <div className="poll-voters-empty">
            <i className="fa-regular fa-folder-open" />
            <p>아직 참여한 사람이 없어요</p>
          </div>
        ) : viewMode === 'byOption' ? (
          /* 옵션별 뷰 */
          <div className="poll-voters-list">
            {Object.values(byOption).map(({ option, voters }) => (
              <div key={option.id} className="poll-voters-section">
                <div className="poll-voters-section-head">
                  <span className="poll-voters-section-title">
                    {option.emoji && <span>{option.emoji}</span>}
                    {option.text}
                  </span>
                  <span className="poll-voters-section-count">{voters.length}명</span>
                </div>
                {voters.length === 0 ? (
                  <p className="poll-voters-section-empty">선택한 사람이 없어요</p>
                ) : (
                  <div className="poll-voters-people">
                    {voters.map((v) => {
                      const u = findMember(v.userId);
                      return (
                        <div key={v.userId} className="poll-voter-chip" title={formatDateTime(v.votedAt)}>
                          <div
                            className="poll-voter-avatar"
                            style={{ backgroundImage: `url('${avatarUrl(u)}')` }}
                          />
                          <span>{u?.full_name || '알 수 없음'}</span>
                          {u?.department && (
                            <span className="poll-voter-dept">· {u.department}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* 사람별 뷰 */
          <div className="poll-voters-list">
            {votes.map((v) => {
              const u = findMember(v.user_id);
              const selectedOpts = (v.option_ids || [])
                .map((oid) => (poll.options || []).find((o) => o.id === oid))
                .filter(Boolean);
              return (
                <div key={v.id} className="poll-voter-row">
                  <div
                    className="poll-voter-avatar lg"
                    style={{ backgroundImage: `url('${avatarUrl(u)}')` }}
                  />
                  <div className="poll-voter-info">
                    <div className="poll-voter-name">
                      {u?.full_name || '알 수 없음'}
                      {u?.department && (
                        <span className="poll-voter-dept">· {u.department}</span>
                      )}
                    </div>
                    <div className="poll-voter-choices">
                      {selectedOpts.map((opt) => (
                        <span key={opt.id} className="poll-voter-choice">
                          {opt.emoji && <span>{opt.emoji}</span>}
                          {opt.text}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="poll-voter-time">
                    {formatDateTime(v.updated_at || v.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={onClose}>
          닫기
        </button>
      </div>
    </Modal>
  );
}