import { useState } from 'react';
import { useBoard } from '../../contexts/BoardContext';

const TABS = [
  { key: 'all', label: '전체', icon: 'fa-solid fa-grip-vertical' },
  { key: '공지사항', label: '공지사항', icon: 'fa-solid fa-bullhorn' },
  { key: '자유게시판', label: '자유게시판', icon: 'fa-regular fa-comment-dots' },
  { key: '기술공유', label: '기술공유', icon: 'fa-solid fa-code' },
];

export default function BoardFilterBar({ onWrite }) {
  const {
    category,
    setCategory,
    sortBy,
    setSortBy,
    search,
    setSearch,
    categoryCounts,
  } = useBoard();

  const [searchInput, setSearchInput] = useState(search);

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setSearch(searchInput);
    }
  };

  return (
    <div className="board-filter-bar">
      <div className="board-tabs">
        {TABS.map((tab) => (
          <div
            key={tab.key}
            className={`board-tab ${category === tab.key ? 'active' : ''}`}
            onClick={() => setCategory(tab.key)}
          >
            <i className={tab.icon}></i> {tab.label}
            <span className="tab-count">{categoryCounts[tab.key] || 0}</span>
          </div>
        ))}
      </div>

      <div className="board-filter-right">
        <div className="board-sort-select">
          <i className="fa-solid fa-arrow-down-wide-short"></i>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="latest">최신순</option>
            <option value="popular">조회순</option>
            <option value="comments">댓글많은순</option>
            <option value="liked">좋아요순</option>
          </select>
        </div>

        <div className="board-search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="제목/내용 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearch}
            onBlur={() => setSearch(searchInput)}
          />
        </div>

        <button className="btn btn-in board-write-btn" onClick={onWrite}>
          <i className="fa-solid fa-pen-to-square"></i> 글쓰기
        </button>
      </div>
    </div>
  );
}