import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useBoard } from '../../contexts/BoardContext';
import AttachmentList from './AttachmentList'; 
import BookmarkButton from '../common/BookmarkButton';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ViewModal({ isOpen, postId, onClose, onEdit }) {
  const { fetchPost, deletePost, toggleLike, addComment, deleteComment, canEdit, isLikedByMe } =
    useBoard();
  const [post, setPost] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      fetchPost(postId).then((data) => {
        setPost(data);
        setLoading(false);
      });
    } else {
      setPost(null);
      setCommentInput('');
    }
  }, [isOpen, postId, fetchPost]);

  const handleLike = async () => {
    if (!post) return;
    await toggleLike(post.id);
    // post 로컬 상태도 업데이트
    const liked = isLikedByMe(post.id);
    setPost((prev) =>
      prev ? { ...prev, likes: liked ? (prev.likes || 0) + 1 : Math.max(0, (prev.likes || 0) - 1) } : prev
    );
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || !post) return;
    const ok = await addComment(post.id, commentInput);
    if (ok) {
      // 다시 가져와서 최신 댓글 목록 반영
      const refreshed = await fetchPost(post.id);
      setPost(refreshed);
      setCommentInput('');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('해당 댓글을 삭제하시겠습니까?')) return;
    const ok = await deleteComment(post.id, commentId);
    if (ok) {
      const refreshed = await fetchPost(post.id);
      setPost(refreshed);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    const ok = await deletePost(post.id);
    if (ok) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const liked = post ? isLikedByMe(post.id) : false;
  const editable = canEdit(post);

  return (
    <Modal
  isOpen={isOpen}
  onClose={onClose}
  size="lg"
  title={null}
  headerExtra={
    post && (
      <BookmarkButton
        kind="post"
        refId={post.id}
        title={post.title}
        subtitle={post.author_name}
        link={`/board?post=${post.id}`}
        size="lg"
      />
    )
  }
>
      {loading || !post ? (
        <div className="board-empty">
          <i className="fa-solid fa-spinner fa-spin"></i> 불러오는 중...
        </div>
      ) : (
        <div className="view-modal-body">
          <div className="view-header">
            {post.is_notice && <span className="notice-tag">공지</span>}
            <h2 className="view-title">{post.title}</h2>
          </div>

          <div className="view-meta">
            <span>
              <i className="fa-regular fa-user"></i> {post.author_name || '익명'}
            </span>
            <span>
              <i className="fa-regular fa-clock"></i> {formatDateTime(post.created_at)}
            </span>
            <span>
              <i className="fa-regular fa-eye"></i> {post.view_count || 0}
            </span>
            <span className="view-category-tag">{post.category || '자유게시판'}</span>
          </div>

          <div className="view-content">{post.content || '내용이 없습니다.'}</div>
        
        {/* ⭐ 첨부파일 목록 추가 */}
          <AttachmentList attachments={post.attachments} />

          <div className="view-like-row">
            <button className={`view-like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              <i className={liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
              좋아요 <strong>{post.likes || 0}</strong>
            </button>
          </div>

          {/* 댓글 영역 */}
          <div className="view-comment-section">
            <h3>
              <i className="fa-regular fa-comments"></i> 댓글{' '}
              <span className="comment-count">{post.comments?.length || 0}</span>
            </h3>

            <div className="comment-list">
              {(post.comments || []).length === 0 ? (
                <div className="comment-empty">아직 댓글이 없습니다.</div>
              ) : (
                post.comments.map((c) => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-avatar">
                      <i className="fa-regular fa-user-circle"></i>
                    </div>
                    <div className="comment-body">
                      <div className="comment-header">
                        <strong>{c.author}</strong>
                        <span>{formatDateTime(c.time)}</span>
                        {c.author_id === post.current_user_id && (
                          <button onClick={() => handleDeleteComment(c.id)}>
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                      <div className="comment-text">{c.text}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="comment-input-row">
              <input
                type="text"
                placeholder="바른 말 고운 말을 사용해주세요."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button className="btn btn-in" onClick={handleAddComment}>
                등록
              </button>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="view-modal-actions">
            {editable && (
              <>
                <button className="btn btn-out" onClick={() => onEdit(post)}>
                  수정
                </button>
                <button className="btn btn-danger" onClick={handleDeletePost}>
                  삭제
                </button>
              </>
            )}
            <button className="btn btn-in" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}