import { useBoard } from '../../contexts/BoardContext';

// 원본의 인기 태그는 하드코딩되어 있었음 — 그대로 유지
const POPULAR_TAGS = [
  { tag: '공지', size: 'lg' },
  { tag: '회식', size: 'md' },
  { tag: '개발', size: 'md' },
  { tag: '복지', size: 'sm' },
  { tag: '팀빌딩', size: 'md' },
  { tag: '재택', size: 'sm' },
  { tag: '이벤트', size: 'lg' },
  { tag: '장비', size: 'sm' },
  { tag: '교육', size: 'md' },
  { tag: '휴가', size: 'sm' },
];

export default function BoardSidebar({ onSelectPost }) {
  const { monthlyRanking, recentComments } = useBoard();

  const truncate = (str, n) =>
    str && str.length > n ? str.slice(0, n) + '...' : str || '';

  return (
    <aside className="board-sidebar">
      {/* 이달의 작성 랭킹 */}
      <div className="panel board-side-panel">
        <div className="board-side-header">
          <h3>
            <i className="fa-solid fa-trophy" style={{ color: 'var(--warning, #f59e0b)' }}></i>{' '}
            이달의 작성 랭킹
          </h3>
        </div>
        {monthlyRanking.length === 0 ? (
          <p className="board-side-empty">이번 달 작성자가 없습니다.</p>
        ) : (
          <ul className="ranking-list">
            {monthlyRanking.map((r, i) => (
              <li key={r.name} className="ranking-item">
                <div className={`rank-num rank-${i + 1}`}>{i + 1}</div>
                <div
                  className="rank-avatar"
                  style={{
                    backgroundImage: `url('https://i.pravatar.cc/150?u=${encodeURIComponent(
                      r.name
                    )}')`,
                  }}
                ></div>
                <span className="rank-name">{r.name}</span>
                <span className="rank-count">{r.count}건</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 인기 태그 */}
      <div className="panel board-side-panel">
        <div className="board-side-header">
          <h3>
            <i className="fa-solid fa-hashtag" style={{ color: 'var(--primary-color, #3b82f6)' }}></i>{' '}
            인기 태그
          </h3>
        </div>
        <div className="tag-cloud">
          {POPULAR_TAGS.map((t) => (
            <span key={t.tag} className={`tag-chip tag-${t.size}`}>
              #{t.tag}
            </span>
          ))}
        </div>
      </div>

      {/* 최근 댓글 */}
      <div className="panel board-side-panel">
        <div className="board-side-header">
          <h3>
            <i className="fa-regular fa-comments" style={{ color: 'var(--success, #10b981)' }}></i>{' '}
            최근 댓글
          </h3>
        </div>
        {recentComments.length === 0 ? (
          <p className="board-side-empty">아직 댓글이 없습니다.</p>
        ) : (
          <ul className="recent-comment-list">
            {recentComments.map((c, i) => (
              <li
                key={`${c.postId}-${i}`}
                className="recent-comment-item"
                onClick={() => onSelectPost(c.postId)}
              >
                <div className="rc-text">{c.text}</div>
                <div className="rc-meta">
                  <span className="rc-author">{c.author}</span>
                  <span>·</span>
                  <span>{truncate(c.postTitle, 18)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}