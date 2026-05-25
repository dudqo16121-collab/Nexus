import { useEffect, useRef, useState } from 'react';
import { useWiki } from '../../contexts/WikiContext';

export default function WikiEditor() {
  const { currentDoc, saving, updateDocument, canEdit } = useWiki();
  const contentRef = useRef(null);
  const [title, setTitle] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const editable = canEdit(currentDoc);

  // currentDoc 변경 시 에디터 동기화
  useEffect(() => {
    if (currentDoc) {
      setTitle(currentDoc.title || '');
      if (contentRef.current) {
        // contentEditable은 React가 직접 제어하지 않음 (innerHTML로 1회만 세팅)
        contentRef.current.innerHTML = currentDoc.content || '';
      }
      setIsDirty(false);
    } else {
      setTitle('');
      if (contentRef.current) contentRef.current.innerHTML = '';
      setIsDirty(false);
    }
  }, [currentDoc?.id]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setIsDirty(true);
  };

  const handleContentInput = () => {
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!currentDoc || !editable) return;
    const ok = await updateDocument(currentDoc.id, {
      title: title.trim() || '제목 없음',
      content: contentRef.current?.innerHTML || '',
    });
    if (ok) setIsDirty(false);
  };

  // 키보드 단축키: Ctrl+S 저장
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && editable) handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDirty, editable, currentDoc, title]);

  // 페이지 이탈 경고
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  if (!currentDoc) {
    return (
      <main className="wiki-editor wiki-editor-empty">
        <div className="wiki-placeholder">
          <i className="fa-solid fa-book-open"></i>
          <p>왼쪽에서 문서를 선택하거나<br />새 문서를 만들어보세요</p>
        </div>
      </main>
    );
  }

  return (
    <main className="wiki-editor">
      <header className="wiki-editor-header">
        <input
          type="text"
          className="wiki-title-input"
          value={title}
          onChange={handleTitleChange}
          placeholder="제목 없음"
          disabled={!editable}
        />
        <div className="wiki-editor-actions">
          {!editable && (
            <span className="wiki-readonly-badge">
              <i className="fa-solid fa-eye"></i> 읽기 전용
            </span>
          )}
          {editable && (
            <button
              className={`wiki-save-btn ${isDirty ? 'dirty' : ''}`}
              onClick={handleSave}
              disabled={!isDirty || saving}
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> 저장 중...
                </>
              ) : isDirty ? (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> 저장
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> 저장됨
                </>
              )}
            </button>
          )}
        </div>
      </header>

      <div className="wiki-editor-meta">
        작성자 <strong>{currentDoc.author_name || '익명'}</strong> ·{' '}
        마지막 수정 {new Date(currentDoc.updated_at).toLocaleString('ko-KR')}
      </div>

      <div
        ref={contentRef}
        className="wiki-content"
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={handleContentInput}
        data-placeholder="여기에 내용을 입력하세요..."
      />
    </main>
  );
}