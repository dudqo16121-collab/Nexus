import { useBoard } from '../../contexts/BoardContext';

export default function BoardPagination() {
  const { page, totalPages, setPage } = useBoard();

  if (totalPages <= 1) return null;

  // 현재 페이지 주변 5개 표시
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="board-pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>
        <i className="fa-solid fa-angles-left"></i>
      </button>
      <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
        <i className="fa-solid fa-angle-left"></i>
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`page-btn ${page === p ? 'active' : ''}`}
          onClick={() => setPage(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="page-btn"
        disabled={page === totalPages}
        onClick={() => setPage(page + 1)}
      >
        <i className="fa-solid fa-angle-right"></i>
      </button>
      <button
        className="page-btn"
        disabled={page === totalPages}
        onClick={() => setPage(totalPages)}
      >
        <i className="fa-solid fa-angles-right"></i>
      </button>
    </div>
  );
}