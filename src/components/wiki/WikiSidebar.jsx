// components/wiki/WikiSidebar.jsx
// 좌측: 검색 + 카테고리 그룹 + 태그 클라우드.

import { useWiki } from '../../contexts/WikiContext';
import { WIKI_CATEGORIES, getCategoryMeta } from '../../config/wikiCategories';
import { SkeletonList } from '../common/Skeleton';
import { useState } from 'react';
import WikiTemplateModal from './WikiTemplateModal';

/* 검색어 강조 */
function HighlightText({ text, query }) {
  if (!text || !query) return text || '';
  const q = query.toLowerCase();
  const lower = String(text).toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="wiki-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function WikiSidebar() {
  const {
    documents,
    documentsByCategory,
    allTags,
    currentDoc,
    loading,
    searchQuery,
    setSearchQuery,
    activeTag,
    setActiveTag,
    collapsedCategories,
    toggleCategoryCollapsed,
    selectDocument,
    createDocument,
    deleteDocument,
    canEdit,
  } = useWiki();

    const [tplModalOpen, setTplModalOpen] = useState(false);

  /* 새 문서 — 템플릿 모달 열기 */
  const handleNewClick = () => {
    setTplModalOpen(true);
  };

  /* 템플릿 선택됨 → 문서 생성 */
  const handleTemplatePick = async (tpl) => {
    await createDocument(tpl);
  };

  const handleDelete = async (e, doc) => {
    e.stopPropagation();
    if (!confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) return;
    await deleteDocument(doc.id);
  };

  const totalFiltered = Object.values(documentsByCategory).reduce(
    (sum, arr) => sum + arr.length, 0
  );

  return (
    <aside className="wiki-sidebar">
      <div className="wiki-sidebar-header">
        <h3><i className="fa-solid fa-book" /> 사내 위키</h3>
        <button
          className="wiki-new-btn"
          onClick={handleNewClick}
          title="새 문서"
        >
          <i className="fa-solid fa-plus" />
        </button>
      </div>

      {/* 검색바 */}
      <div className="wiki-search-bar">
        <i className="fa-solid fa-magnifying-glass" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="문서 검색..."
        />
        {searchQuery && (
          <button
            type="button"
            className="wiki-search-clear"
            onClick={() => setSearchQuery('')}
            title="지우기"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      {/* 활성 태그 표시 */}
      {activeTag && (
        <div className="wiki-active-tag">
          <span>
            <i className="fa-solid fa-tag" /> #{activeTag}
          </span>
          <button onClick={() => setActiveTag(null)} title="태그 해제">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* 문서 트리 */}
      <div className="wiki-doc-list">
        {loading && documents.length === 0 ? (
          <div style={{ padding: '8px' }}>
            <SkeletonList count={6} showAvatar={false} />
          </div>
        ) : documents.length === 0 ? (
          <div className="wiki-empty">
            아직 문서가 없어요.<br />
            <button className="wiki-empty-btn" onClick={() => handleNew()}>
              첫 문서 만들기
            </button>
          </div>
        ) : totalFiltered === 0 ? (
          <div className="wiki-empty">
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '1.4rem', opacity: 0.4, marginBottom: 8, display: 'block' }} />
            검색 결과가 없어요.
          </div>
        ) : (
          /* 카테고리별 그룹 */
          WIKI_CATEGORIES.map((catDef) => {
            const docs = documentsByCategory[catDef.value] || [];
            if (docs.length === 0) return null;

            const collapsed = collapsedCategories.has(catDef.value);

            return (
              <div key={catDef.value} className="wiki-cat-group">
                <button
                  type="button"
                  className="wiki-cat-header"
                  onClick={() => toggleCategoryCollapsed(catDef.value)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i
                      className={`fa-solid ${catDef.icon}`}
                      style={{ color: catDef.color, fontSize: '0.78rem' }}
                    />
                    {catDef.value}
                    <span className="wiki-cat-count">{docs.length}</span>
                  </span>
                  <i
                    className={`fa-solid fa-chevron-down wiki-cat-chev ${
                      collapsed ? '' : 'rotated'
                    }`}
                  />
                </button>

                {!collapsed && (
                  <div className="wiki-cat-docs">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className={`wiki-doc-item ${
                          currentDoc?.id === doc.id ? 'active' : ''
                        }`}
                        onClick={() => selectDocument(doc.id)}
                      >
                        <div className="wiki-doc-info">
                          <div className="wiki-doc-title">
                            <HighlightText
                              text={doc.title || '제목 없음'}
                              query={searchQuery}
                            />
                          </div>
                          <div className="wiki-doc-meta">
                            <span>{doc.author_name || '익명'}</span>
                            <span>·</span>
                            <span>{formatDate(doc.updated_at)}</span>
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="wiki-doc-tags">
                              {doc.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="wiki-doc-tag"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTag(t);
                                  }}
                                >
                                  #{t}
                                </span>
                              ))}
                              {doc.tags.length > 3 && (
                                <span className="wiki-doc-tag-more">+{doc.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {canEdit(doc) && (
                          <button
                            className="wiki-doc-delete"
                            onClick={(e) => handleDelete(e, doc)}
                            title="삭제"
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 태그 클라우드 */}
      {allTags.length > 0 && (
        <div className="wiki-tag-cloud">
          <div className="wiki-tag-cloud-title">
            <i className="fa-solid fa-tags" /> 태그
          </div>
          <div className="wiki-tag-cloud-list">
            {allTags.slice(0, 20).map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                className={`wiki-tag-pill ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                title={`${count}개 문서`}
              >
                #{tag}
                <span className="wiki-tag-count">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <WikiTemplateModal
        isOpen={tplModalOpen}
        onClose={() => setTplModalOpen(false)}
        onSelect={handleTemplatePick}
      />
    </aside>
  );
}