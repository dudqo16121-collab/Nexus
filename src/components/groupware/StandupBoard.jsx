// components/groupware/StandupBoard.jsx
// 그룹웨어 — 데일리 스탠드업 보드.

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStandup } from '../../contexts/StandupContext';

function avatarUrlOf(uid) {
  return `https://i.pravatar.cc/150?u=${uid || 'x'}`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export default function StandupBoard() {
  const { user } = useAuth();
  const { todayStandups, myToday, openEditor, loading } = useStandup();
  const [expandedId, setExpandedId] = useState(null);

  /* 내 것 먼저, 그다음 최신순 */
  const sorted = [...todayStandups].sort((a, b) => {
    if (a.user_id === user?.id) return -1;
    if (b.user_id === user?.id) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="bento-card card-standup-board">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-mug-saucer" style={{ color: '#f59e0b' }} />
          오늘의 스탠드업
          {todayStandups.length > 0 && (
            <span className="standup-count">{todayStandups.length}</span>
          )}
        </h3>
        <button
          type="button"
          onClick={openEditor}
          className={`standup-write-btn ${myToday ? 'edit' : ''}`}
        >
          <i className={`fa-solid ${myToday ? 'fa-pen' : 'fa-plus'}`} />
          {myToday ? '내 글 수정' : '작성하기'}
        </button>
      </div>

      <div className="standup-list">
        {loading && todayStandups.length === 0 ? (
          <div className="standup-empty">
            <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
          </div>
        ) : sorted.length === 0 ? (
          <div className="standup-empty">
            <i className="fa-solid fa-mug-saucer" />
            <p>아직 오늘 작성된 스탠드업이 없어요.</p>
            <button type="button" className="standup-empty-btn" onClick={openEditor}>
              첫 스탠드업 작성하기
            </button>
          </div>
        ) : (
          sorted.map((s) => {
            const isMine = s.user_id === user?.id;
            const expanded = expandedId === s.id;
            return (
              <div
                key={s.id}
                className={`standup-item ${isMine ? 'mine' : ''} ${expanded ? 'expanded' : ''}`}
                onClick={() => toggle(s.id)}
              >
                <div
                  className="standup-avatar"
                  style={{ backgroundImage: `url('${avatarUrlOf(s.user_id)}')` }}
                />
                <div className="standup-body">
                  <div className="standup-head">
                    <strong>{s.user_name || '동료'}</strong>
                    {s.department && <span className="standup-dept">{s.department}</span>}
                    {isMine && <span className="standup-badge-mine">나</span>}
                    {s.blocker && (
                      <span className="standup-badge-blocker">
                        <i className="fa-solid fa-triangle-exclamation" /> 블로커
                      </span>
                    )}
                    <span className="standup-time">{timeAgo(s.updated_at || s.created_at)}</span>
                  </div>

                  {/* 요약(접힘) */}
                  {!expanded && (
                    <p className="standup-summary">
                      <i className="fa-solid fa-bullseye" /> {s.today || '오늘 할 일이 비어있어요.'}
                    </p>
                  )}

                  {/* 펼침 */}
                  {expanded && (
                    <div className="standup-detail">
                      {s.yesterday && (
                        <div className="standup-row">
                          <div className="standup-row-label">
                            <i className="fa-solid fa-clock-rotate-left" /> 어제
                          </div>
                          <div className="standup-row-text">{s.yesterday}</div>
                        </div>
                      )}
                      <div className="standup-row">
                        <div className="standup-row-label standup-row-today">
                          <i className="fa-solid fa-bullseye" /> 오늘
                        </div>
                        <div className="standup-row-text">{s.today || '-'}</div>
                      </div>
                      {s.blocker && (
                        <div className="standup-row">
                          <div className="standup-row-label standup-row-blocker">
                            <i className="fa-solid fa-triangle-exclamation" /> 블로커
                          </div>
                          <div className="standup-row-text">{s.blocker}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <i
                  className={`fa-solid fa-chevron-down standup-chev ${expanded ? 'rot' : ''}`}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}