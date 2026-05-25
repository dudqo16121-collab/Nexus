import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoard } from '../../contexts/BoardContext';

export default function DashboardNotices() {
  const { dashboardNotices, fetchDashboardNotices } = useBoard();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardNotices();
  }, [fetchDashboardNotices]);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };

  // 게시판으로 이동 (특정 글 선택 상태로)
  // BoardContext는 페이지 전환 후에도 유지되지만,
  // "특정 글 열기"는 Board 페이지의 로컬 상태라 쿼리파라미터로 전달
  const goToPost = (postId) => {
    navigate(`/board?post=${postId}`);
  };

  const goToBoard = () => {
    navigate('/board');
  };

  return (
    <section className="panel dashboard-notices">
      <div className="panel-header">
        <h2>
          <i className="fa-solid fa-bullhorn" style={{ color: 'var(--primary-color, #3b82f6)' }}></i>{' '}
          공지사항
        </h2>
        <span className="panel-more" onClick={goToBoard}>
          더보기 <i className="fa-solid fa-arrow-right"></i>
        </span>
      </div>

      <div className="dashboard-notice-list">
        {dashboardNotices.length === 0 ? (
          <p className="dashboard-notice-empty">등록된 공지사항이 없습니다.</p>
        ) : (
          dashboardNotices.map((post) => (
            <div
              key={post.id}
              className="dashboard-notice-item"
              onClick={() => goToPost(post.id)}
            >
              <span
                className={`notice-badge ${post.is_notice ? 'badge-must' : 'badge-normal'}`}
              >
                {post.is_notice ? '필독' : '일반'}
              </span>
              <div className="dashboard-notice-info">
                <p className="dashboard-notice-title">{post.title}</p>
                <span className="dashboard-notice-meta">
                  {post.author_name || '익명'} | {formatDate(post.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}