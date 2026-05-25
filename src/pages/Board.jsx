import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBoard } from '../contexts/BoardContext';
import BoardStatsGrid from '../components/board/BoardStatsGrid';        // ⭐
import HotPostsCarousel from '../components/board/HotPostsCarousel';   // ⭐
import BoardFilterBar from '../components/board/BoardFilterBar';
import BoardTable from '../components/board/BoardTable';
import BoardPagination from '../components/board/BoardPagination';
import BoardSidebar from '../components/board/BoardSidebar';           // ⭐
import WriteModal from '../components/board/WriteModal';
import ViewModal from '../components/board/ViewModal';

export default function Board() {
  const { fetchPosts } = useBoard();
  const [searchParams, setSearchParams] = useSearchParams();
  const [writeOpen, setWriteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

    // ⭐ 쿼리파라미터로 특정 글 열기 (대시보드에서 진입 시)
  useEffect(() => {
    const postId = searchParams.get('post');
    if (postId) {
      setSelectedPostId(postId);
      setViewOpen(true);
      // 파라미터 제거 (뒤로가기/새로고침 시 다시 안 열리게)
      searchParams.delete('post');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  const handleSelectPost = (id) => {
    setSelectedPostId(id);
    setViewOpen(true);
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setViewOpen(false);
    setWriteOpen(true);
  };

  const handleWriteClose = () => {
    setWriteOpen(false);
    setEditingPost(null);
  };

  return (
    <div className="board-page">
      <header className="board-page-header">
        <h2>
          <i className="fa-solid fa-clipboard-list"></i> 전사 게시판
        </h2>
        <p>사내 소식과 정보를 자유롭게 공유하세요.</p>
      </header>

      {/* ⭐ 통계 위젯 */}
      <BoardStatsGrid />

      {/* ⭐ HOT 캐러셀 */}
      <HotPostsCarousel onSelectPost={handleSelectPost} />

      {/* 메인 레이아웃: 본문 + 사이드바 */}
      <div className="board-main-layout">
        <div className="board-container">
          <BoardFilterBar onWrite={() => setWriteOpen(true)} />
          <BoardTable onSelectPost={handleSelectPost} />
          <BoardPagination />
        </div>

        {/* ⭐ 사이드바 */}
        <BoardSidebar onSelectPost={handleSelectPost} />
      </div>

      <WriteModal
        isOpen={writeOpen}
        onClose={handleWriteClose}
        editingPost={editingPost}
      />

      <ViewModal
        isOpen={viewOpen}
        postId={selectedPostId}
        onClose={() => setViewOpen(false)}
        onEdit={handleEdit}
      />
    </div>
  );
}