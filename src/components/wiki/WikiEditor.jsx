// components/wiki/WikiEditor.jsx
// 리치 텍스트 에디터 + 툴바 + 목차.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWiki } from '../../contexts/WikiContext';
import { WIKI_CATEGORIES, getCategoryMeta } from '../../config/wikiCategories';
import BookmarkButton from '../common/BookmarkButton';
import WikiToolbar from './WikiToolbar';
import WikiToc from './WikiToc';
import WikiLinkAutocomplete from './WikiLinkAutocomplete';
import { makeWikiLinkHtml, detectWikiLinkTrigger, convertBracketsToLinks } from '../../utils/wikiLinks';
import WikiRevisionPanel from './WikiRevisionPanel';
import WikiBacklinks from './WikiBacklinks';

export default function WikiEditor() {
  const { currentDoc, saving, updateDocument, canEdit, documents, selectDocument, createDocument } = useWiki();
  const contentRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('기타');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [contentVersion, setContentVersion] = useState(0); 
  const [autocomplete, setAutocomplete] = useState(null); // 자동완성 상태
  const [revisionOpen, setRevisionOpen] = useState(false);

  const editable = canEdit(currentDoc);

  /* currentDoc 변경 시 에디터 동기화 */
  useEffect(() => {
    if (currentDoc) {
      setTitle(currentDoc.title || '');
      setCategory(currentDoc.category || '기타');
      setTags(currentDoc.tags || []);
      if (contentRef.current) {
        /* 옛 데이터의 [[제목]] 텍스트를 위키 링크로 자동 변환 */
        const raw = currentDoc.content || '';
        contentRef.current.innerHTML = convertBracketsToLinks(raw, documents);
        setContentVersion((v) => v + 1);
      }
      setIsDirty(false);
    } else {
      setTitle('');
      setCategory('기타');
      setTags([]);
      if (contentRef.current) contentRef.current.innerHTML = '';
      setIsDirty(false);
    }
  }, [currentDoc?.id, documents.length]);

  /* 본문 input — TOC 갱신용 및 자동완성 감지 */
  const handleContentInput = useCallback(() => {
    setIsDirty(true);
    setContentVersion((v) => v + 1);
    
    /* [[ 검색어 감지 */
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) {
      setAutocomplete(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const trigger = detectWikiLinkTrigger(range.startContainer, range.startOffset);
    if (trigger) {
      /* 커서 위치 가져오기 */
      const rect = range.getBoundingClientRect();
      const editorRect = contentRef.current.getBoundingClientRect();
      setAutocomplete({
        query: trigger.query,
        position: {
          top: rect.bottom - editorRect.top + 4,
          left: rect.left - editorRect.left,
        },
        triggerInfo: trigger,
      });
    } else {
      setAutocomplete(null);
    }
  }, []);

  /* 마크다운 단축키 자동 변환 */
  const handleContentKeyDown = useCallback((e) => {
    if (!editable) return;
    if (e.key !== ' ') return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;

    const patterns = [
      { regex: /^### $/, tag: 'h3' },
      { regex: /^## $/,  tag: 'h2' },
      { regex: /^# $/,   tag: 'h1' },
      { regex: /^> $/,   tag: 'blockquote' },
      { regex: /^- $/,   list: 'insertUnorderedList' },
      { regex: /^1\. $/, list: 'insertOrderedList' },
    ];

    const beforeText = range.startContainer.textContent?.substring(0, range.startOffset) || '';
    const fullText = beforeText + ' ';

    for (const p of patterns) {
      if (p.regex.test(fullText)) {
        e.preventDefault();
        const textNode = range.startContainer;
        if (textNode.nodeType === 3) {
          textNode.textContent = textNode.textContent.substring(range.startOffset);
        }
        if (p.tag) {
          document.execCommand('formatBlock', false, `<${p.tag}>`);
        } else if (p.list) {
          document.execCommand(p.list, false, null);
        }
        setContentVersion((v) => v + 1);
        return;
      }
    }
  }, [editable]);

  /* 위키 링크 삽입 (자동완성 선택 시) */
  const handleAutocompleteSelect = useCallback(async (selected) => {
    const trigger = autocomplete?.triggerInfo;
    if (!trigger) return;

    let docId = selected.id;
    let docTitle = selected.title;
    let exists = !selected.createNew;

    if (selected.createNew) {
      const newDoc = await createDocument('기타');
      if (newDoc) {
        await updateDocument(newDoc.id, { title: docTitle });
        docId = newDoc.id;
        exists = true;
      }
    }

    const linkHtml = makeWikiLinkHtml({ docId, title: docTitle, exists });
    
    const node = trigger.textNode;
    const text = node.textContent;
    const before = text.substring(0, trigger.startIndex);
    const after = text.substring(trigger.startIndex + trigger.matchLength);

    node.textContent = before;
    
    const range = document.createRange();
    range.setStart(node, before.length);
    range.collapse(true);
    
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const wrapper = document.createElement('span');
    wrapper.innerHTML = linkHtml + '&nbsp;' + escapeText(after);
    
    const fragment = document.createDocumentFragment();
    while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
    range.insertNode(fragment);

    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);

    setAutocomplete(null);
    setIsDirty(true);
    setContentVersion((v) => v + 1);
    contentRef.current?.focus();
  }, [autocomplete, createDocument, updateDocument]);

  /* 본문 클릭 시 위키 링크 처리 */
  const handleContentClick = useCallback(async (e) => {
    const target = e.target.closest('a.wiki-link');
    if (!target) return;
    e.preventDefault();
    
    const docId = target.dataset.docId;
    const docTitle = target.dataset.docTitle;
    
    if (docId) {
      selectDocument(docId);
    } else if (docTitle) {
      if (!window.confirm(`"${docTitle}" 문서를 만들까요?`)) return;
      const newDoc = await createDocument('기타');
      if (newDoc) {
        await updateDocument(newDoc.id, { title: docTitle });
        const reds = contentRef.current.querySelectorAll(`a.wiki-link-red[data-doc-title="${cssEscape(docTitle)}"]`);
        reds.forEach((el) => {
          el.classList.remove('wiki-link-red');
          el.dataset.docId = newDoc.id;
        });
        setIsDirty(true);
      }
    }
  }, [selectDocument, createDocument, updateDocument]);

  /* 저장 */
  const handleSave = async () => {
    if (!currentDoc || !editable) return;
    const ok = await updateDocument(currentDoc.id, {
      title: title.trim() || '제목 없음',
      content: contentRef.current?.innerHTML || '',
      category,
      tags,
    });
    if (ok) setIsDirty(false);
  };

  /* 키보드 단축키 — Ctrl+S 저장 */
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && editable) handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDirty, editable, currentDoc, title, category, tags]);

  /* 페이지 이탈 경고 */
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

  /* 태그 및 카테고리 로직 */
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setIsDirty(true);
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, '').replace(/,/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setIsDirty(true);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
      setIsDirty(true);
    }
  };

  const handleTagRemove = (t) => {
    setTags(tags.filter((x) => x !== t));
    setIsDirty(true);
  };

  if (!currentDoc) {
    return (
      <main className="wiki-editor wiki-editor-empty">
        <div className="wiki-placeholder">
          <i className="fa-solid fa-book-open" />
          <p>왼쪽에서 문서를 선택하거나<br />새 문서를 만들어보세요</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="wiki-editor wiki-editor-with-toc">
        <header className="wiki-editor-header">
          <input
            type="text"
            className="wiki-title-input"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
            placeholder="제목 없음"
            disabled={!editable}
          />
          <div className="wiki-editor-actions">
            <BookmarkButton
              kind="wiki"
              refId={currentDoc.id}
              title={currentDoc.title || '제목 없음'}
              subtitle={`작성자 ${currentDoc.author_name || '익명'}`}
              link={`/wiki?doc=${currentDoc.id}`}
              size="md"
            />
              <button
    type="button"
    className="wiki-history-btn"
    onClick={() => setRevisionOpen(true)}
    title="수정 이력"
  >
    <i className="fa-solid fa-clock-rotate-left" />
    이력
  </button>
            {!editable && (
              <span className="wiki-readonly-badge">
                <i className="fa-solid fa-eye" /> 읽기 전용
              </span>
            )}
            {editable && (
              <button
                className={`wiki-save-btn ${isDirty ? 'dirty' : ''}`}
                onClick={handleSave}
                disabled={!isDirty || saving}
              >
                {saving ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> 저장 중...</>
                ) : isDirty ? (
                  <><i className="fa-solid fa-floppy-disk" /> 저장</>
                ) : (
                  <><i className="fa-solid fa-check" /> 저장됨</>
                )}
              </button>
            )}
          </div>
        </header>

        {/* 카테고리 + 태그 바 */}
        <div className="wiki-meta-bar">
          <div className="wiki-meta-cat">
            <label>
              <i
                className={`fa-solid ${getCategoryMeta(category).icon}`}
                style={{ color: getCategoryMeta(category).color }}
              />
            </label>
            <select
              value={category}
              onChange={handleCategoryChange}
              disabled={!editable}
              className="wiki-cat-select"
            >
              {WIKI_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.value}</option>
              ))}
            </select>
          </div>

          <div className="wiki-meta-tags">
            {tags.map((t) => (
              <span key={t} className="wiki-meta-tag">
                #{t}
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleTagRemove(t)}
                    className="wiki-meta-tag-remove"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </span>
            ))}
            {editable && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagAdd}
                placeholder={tags.length === 0 ? '태그 추가 (Enter)' : '+ 태그'}
                className="wiki-meta-tag-input"
              />
            )}
          </div>
        </div>

        {/* 툴바 — 편집 가능할 때만 */}
        {editable && (
          <WikiToolbar
            disabled={!editable}
            contentRef={contentRef}
            onChange={handleContentInput}
          />
        )}

        <div className="wiki-editor-meta">
          작성자 <strong>{currentDoc.author_name || '익명'}</strong> ·{' '}
          마지막 수정 {new Date(currentDoc.updated_at).toLocaleString('ko-KR')}
        </div>

        <div style={{ position: 'relative' }}>
          <div
            ref={contentRef}
            className="wiki-content"
            contentEditable={editable}
            suppressContentEditableWarning
            onInput={handleContentInput}
            onKeyDown={handleContentKeyDown}
            onClick={handleContentClick}
            data-placeholder="여기에 내용을 입력하세요... (# 제목, - 리스트, > 인용 자동 변환)"
          />
          {autocomplete && editable && (
            <WikiLinkAutocomplete
              query={autocomplete.query}
              position={autocomplete.position}
              onSelect={handleAutocompleteSelect}
              onClose={() => setAutocomplete(null)}
            />
          )}
        </div>
              {/* ⭐ 백링크 섹션 — 본문 아래 */}
      <WikiBacklinks
        documentId={currentDoc.id}
        documentTitle={currentDoc.title}
      />
      </main>

      {/* 우측 목차 */}
      <WikiToc contentRef={contentRef} content={contentVersion} />

      {/* ⭐ 수정 이력 패널 추가 */}
      <WikiRevisionPanel
        open={revisionOpen}
        onClose={() => setRevisionOpen(false)}
      />
    </>
  );
}

/* ============================================================
   유틸리티 함수 (컴포넌트 외부)
   ============================================================ */
function escapeText(s) {
  return String(s).replace(/[<>&]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;',
  }[c]));
}

function cssEscape(s) {
  return String(s).replace(/["\\]/g, '\\$&');
}