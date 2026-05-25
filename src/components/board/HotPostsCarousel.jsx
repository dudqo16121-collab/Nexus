import { useRef } from 'react';
import { useBoard } from '../../contexts/BoardContext';

export default function HotPostsCarousel({ onSelectPost }) {
  const { hotPosts } = useBoard();
  const trackRef = useRef(null);

  const scroll = (dir) => {
    if (!trackRef.current) return;
    const amount = 320; // 카드 2개 정도
    trackRef.current.scrollBy({
      left: dir === 'next' ? amount : -amount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="hot-posts-section">
      <div className="hot-posts-header">
        <h3>
          <i className="fa-solid fa-fire-flame-curved" style={{ color: 'var(--danger, #ef4444)' }}></i>{' '}
          지금 인기있는 글 <span className="hot-badge">HOT</span>
        </h3>
        <div className="hot-nav-controls">
          <button
            className="hot-nav-btn"
            type="button"
            aria-label="이전"
            onClick={() => scroll('prev')}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button
            className="hot-nav-btn"
            type="button"
            aria-label="다음"
            onClick={() => scroll('next')}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      {hotPosts.length === 0 ? (
        <div className="hot-posts-empty">
          <i className="fa-regular fa-newspaper"></i>
          <p>아직 인기 게시글이 없습니다.</p>
        </div>
      ) : (
        <div className="hot-posts-track" ref={trackRef}>
          {hotPosts.map((post, i) => (
            <div
              key={post.id}
              className={`hot-post-card rank-${i + 1}`}
              onClick={() => onSelectPost(post.id)}
            >
              <div className="hot-rank">{i + 1}</div>
              <span className="hot-category">
                {post.category || (post.is_notice ? '공지사항' : '자유게시판')}
              </span>
              <div className="hot-title">{post.title || '제목 없음'}</div>
              <div className="hot-meta">
                <span className="meta-views">
                  <i className="fa-regular fa-eye"></i> {post.view_count || 0}
                </span>
                <span className="meta-likes">
                  <i className="fa-regular fa-heart"></i> {post.likes || 0}
                </span>
                <span className="meta-comments">
                  <i className="fa-regular fa-comment"></i>{' '}
                  {post.comments?.length || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}