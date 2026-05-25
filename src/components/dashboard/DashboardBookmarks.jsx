// components/dashboard/DashboardBookmarks.jsx
// 대시보드 우측/좌측에 표시할 즐겨찾기 위젯.
// 핀 우선, 최대 8개.

import { useNavigate } from 'react-router-dom';
import { useBookmark, BOOKMARK_KIND_META } from '../../contexts/BookmarkContext';

export default function DashboardBookmarks() {
  const navigate = useNavigate();
  const { bookmarks } = useBookmark();

  const top = bookmarks.slice(0, 8);

  return (
    <section className="panel">
      <div className="panel-header" style={{ marginBottom: 14 }}>
        <h2>
          <i className="fa-solid fa-star" style={{ color: '#fbbf24', marginRight: 8 }} />
          즐겨찾기
        </h2>
        <span
          style={{
            fontSize: '0.85rem',
            cursor: 'pointer',
            color: 'var(--primary-color)',
            fontWeight: 600,
          }}
          onClick={() => navigate('/bookmarks')}
        >
          전체 보기 <i className="fa-solid fa-arrow-right" />
        </span>
      </div>

      {top.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '30px 20px',
            color: 'var(--text-muted)',
          }}
        >
          <i
            className="fa-regular fa-star"
            style={{ fontSize: '2rem', display: 'block', marginBottom: 10, opacity: 0.5 }}
          />
          <p style={{ fontSize: '0.9rem', margin: 0 }}>
            아직 즐겨찾기한 항목이 없어요.
          </p>
          <p style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: 4 }}>
            게시글이나 문서에서 ⭐ 버튼을 눌러보세요.
          </p>
        </div>
      ) : (
        <div className="dash-bookmark-grid">
          {top.map((b) => {
            const meta = BOOKMARK_KIND_META[b.kind] || BOOKMARK_KIND_META.page;
            return (
              <button
                key={b.id}
                type="button"
                className="dash-bookmark-tile"
                onClick={() => navigate(b.link)}
                title={b.title}
              >
                <div
                  className="dash-bookmark-icon"
                  style={{
                    background: `${b.color || meta.color}15`,
                    color: b.color || meta.color,
                  }}
                >
                  <i className={`fa-solid ${b.icon || meta.icon}`} />
                </div>
                <div className="dash-bookmark-title">{b.title}</div>
                <div className="dash-bookmark-kind">{meta.label}</div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}