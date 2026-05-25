import { useWiki } from '../../contexts/WikiContext';

export default function WikiSidebar() {
  const {
    documents,
    currentDoc,
    loading,
    selectDocument,
    createDocument,
    deleteDocument,
    canEdit,
  } = useWiki();

  const handleNew = async () => {
    await createDocument();
  };

  const handleDelete = async (e, doc) => {
    e.stopPropagation();
    if (!confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) return;
    await deleteDocument(doc.id);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="wiki-sidebar">
      <div className="wiki-sidebar-header">
        <h3>
          <i className="fa-solid fa-book"></i> 사내 위키
        </h3>
        <button className="wiki-new-btn" onClick={handleNew} title="새 문서">
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>

      <div className="wiki-doc-list">
        {loading && documents.length === 0 ? (
          <div className="wiki-empty">불러오는 중...</div>
        ) : documents.length === 0 ? (
          <div className="wiki-empty">
            아직 문서가 없어요.<br />
            <button className="wiki-empty-btn" onClick={handleNew}>
              첫 문서 만들기
            </button>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className={`wiki-doc-item ${
                currentDoc?.id === doc.id ? 'active' : ''
              }`}
              onClick={() => selectDocument(doc.id)}
            >
              <div className="wiki-doc-info">
                <div className="wiki-doc-title">{doc.title || '제목 없음'}</div>
                <div className="wiki-doc-meta">
                  <span>{doc.author_name || '익명'}</span>
                  <span>·</span>
                  <span>{formatDate(doc.updated_at)}</span>
                </div>
              </div>
              {canEdit(doc) && (
                <button
                  className="wiki-doc-delete"
                  onClick={(e) => handleDelete(e, doc)}
                  title="삭제"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}