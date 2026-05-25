import { useEffect, useState } from 'react';
import { useSearch } from '../../contexts/SearchContext';

export default function DashboardHeader() {
  const [currentDate, setCurrentDate] = useState('');
  const { openPalette } = useSearch()

  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    setCurrentDate(formatted);
  }, []);

  return (
    <header style={{ marginBottom: '24px' }}>
      <div
        className="search-box"
        style={{ cursor: 'pointer' }}
        title="전체 검색 (Ctrl+K)"
        onClick={openPalette}  // ⭐ 추가
      >
        <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)' }}></i>
        <input
          type="text"
          placeholder="통합 검색... (단축키: Ctrl + K)"
          readOnly
          onFocus={openPalette}  // ⭐ 추가 — 키보드 접근성
          style={{ cursor: 'pointer' }}
        />
      </div>

    </header>
  );
}