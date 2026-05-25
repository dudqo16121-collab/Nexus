import { useBoard } from '../../contexts/BoardContext';
import { SkeletonTable } from '../common/Skeleton';

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function BoardTable({ onSelectPost }) {
  const { posts, loading, page } = useBoard();

  if (loading && posts.length === 0) {
    return (
      <div style={{ padding: '8px 0' }}>
        <SkeletonTable rows={8} cols={7} />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="board-empty">
        <i className="fa-regular fa-folder-open"></i>
        <p>게시글이 없습니다.</p>
      </div>
    );
  }

  return (
    <table className="board-table board-table-enhanced">
      <thead>
        <tr>
          <th style={{ width: 70, textAlign: 'center' }}>번호</th>
          <th style={{ width: 110 }}>분류</th>
          <th>제목</th>
          <th style={{ width: 150 }}>작성자</th>
          <th style={{ width: 110 }}>작성일</th>
          <th style={{ width: 80, textAlign: 'center' }}>
            <i className="fa-regular fa-eye"></i>
          </th>
          <th style={{ width: 80, textAlign: 'center' }}>
            <i className="fa-regular fa-heart"></i>
          </th>
        </tr>
      </thead>
      <tbody>
        {posts.map((post, idx) => (
          <tr
            key={post.id}
            className={`board-row ${post.is_notice ? 'is-notice' : ''}`}
            onClick={() => onSelectPost(post.id)}
          >
            <td style={{ textAlign: 'center' }}>
              {post.is_notice ? (
                <i className="fa-solid fa-bullhorn" style={{ color: 'var(--danger)' }}></i>
              ) : (
                (page - 1) * 20 + idx + 1
              )}
            </td>
            <td>
              <span className={`board-category-chip cat-${post.category || '자유게시판'}`}>
                {post.category || '자유게시판'}
              </span>
            </td>
            <td className="board-title-cell">
              {post.title}
              {(post.comments?.length || 0) > 0 && (
                <span className="board-comment-count">[{post.comments.length}]</span>
              )}
              {(post.attachments?.length || 0) > 0 && (
                <i className="fa-solid fa-paperclip board-attach-icon"></i>
              )}
            </td>
            <td>{post.author_name || '익명'}</td>
            <td>{formatDate(post.created_at)}</td>
            <td style={{ textAlign: 'center' }}>{post.view_count || 0}</td>
            <td style={{ textAlign: 'center' }}>{post.likes || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}