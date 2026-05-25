// components/wiki/WikiBacklinks.jsx
// 문서 하단에 자동 표시되는 백링크 섹션.
// 현재 문서를 참조하는 다른 문서들을 카드로 표시.

import { useEffect, useState } from 'react';
import { useWiki } from '../../contexts/WikiContext';
import { getCategoryMeta } from '../../config/wikiCategories';

/* 간단한 스니펫 정제 — HTML 태그 제거 + 줄바꿈 정리 */
function cleanSnippet(text, currentTitle) {
  if (!text) return '';
  let cleaned = String(text)
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
  /* 너무 길면 자르기 */
  if (cleaned.length > 140) cleaned = cleaned.slice(0, 140) + '...';
  return cleaned;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function WikiBacklinks({ documentId, documentTitle }) {
  const { fetchBacklinks, selectDocument } = useWiki();
  const [backlinks, setBacklinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!documentId) {
      setBacklinks([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchBacklinks(documentId).then((rows) => {
      if (!cancelled) {
        setBacklinks(rows);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [documentId, fetchBacklinks]);

  /* 로딩 중이거나 백링크 없으면 섹션 자체 숨김 */
  if (loading) {
    return (
      <div className="wiki-backlinks wiki-backlinks-loading">
        <i className="fa-solid fa-spinner fa-spin" /> 백링크 확인 중...
      </div>
    );
  }
  if (backlinks.length === 0) return null;

  return (
    <div className="wiki-backlinks">
      <button
        type="button"
        className="wiki-backlinks-header"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>
          <i className="fa-solid fa-link" />
          이 문서를 참조하는 문서
          <span className="wiki-backlinks-count">{backlinks.length}</span>
        </span>
        <i
          className={`fa-solid fa-chevron-down wiki-backlinks-chev ${
            collapsed ? '' : 'rotated'
          }`}
        />
      </button>

      {!collapsed && (
        <div className="wiki-backlinks-grid">
          {backlinks.map((b) => {
            const meta = getCategoryMeta(b.category);
            return (
              <button
                key={b.id}
                type="button"
                className="wiki-backlink-card"
                onClick={() => selectDocument(b.id)}
              >
                <div className="wiki-backlink-card-header">
                  <span
                    className="wiki-backlink-cat"
                    style={{ color: meta.color, background: `${meta.color}15` }}
                  >
                    <i className={`fa-solid ${meta.icon}`} />
                    {b.category || '기타'}
                  </span>
                  <span className="wiki-backlink-time">
                    {timeAgo(b.updated_at)}
                  </span>
                </div>
                <h4 className="wiki-backlink-title">{b.title || '제목 없음'}</h4>
                {b.snippet && (
                  <p className="wiki-backlink-snippet">
                    {cleanSnippet(b.snippet, documentTitle)}
                  </p>
                )}
                <div className="wiki-backlink-footer">
                  <i className="fa-solid fa-user" />
                  {b.author_name || '익명'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}