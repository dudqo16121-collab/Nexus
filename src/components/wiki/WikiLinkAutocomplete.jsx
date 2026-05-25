// components/wiki/WikiLinkAutocomplete.jsx
// [[ 입력 시 등장하는 자동완성 드롭다운.
// 현재 위키 문서 목록을 검색해서 보여주고, 선택 시 위키 링크 삽입.

import { useEffect, useState, useRef } from 'react';
import { useWiki } from '../../contexts/WikiContext';

export default function WikiLinkAutocomplete({
  query,
  position,        // { top, left }
  onSelect,        // (doc | { title }) => void
  onClose,
}) {
  const { documents } = useWiki();
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef(null);

  /* 검색 필터링 */
  const q = (query || '').toLowerCase().trim();
  const matched = documents
    .filter((d) =>
      !q || (d.title || '').toLowerCase().includes(q)
    )
    .slice(0, 8);

  /* "새 문서 만들기" 옵션 — 정확히 일치하는 게 없으면 표시 */
  const exactExists = matched.some(
    (d) => (d.title || '').toLowerCase() === q
  );
  const showCreate = q && !exactExists;

  /* 키보드 네비 */
  useEffect(() => {
    const totalCount = matched.length + (showCreate ? 1 : 0);
    const handler = (e) => {
      if (totalCount === 0) {
        if (e.key === 'Escape') onClose?.();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, totalCount - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (activeIdx < matched.length) {
          onSelect(matched[activeIdx]);
        } else {
          /* 새 문서 만들기 */
          onSelect({ title: query.trim(), createNew: true });
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [matched, activeIdx, showCreate, onSelect, onClose, query]);

  /* 쿼리 바뀌면 activeIdx 0 으로 */
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  /* 활성 항목 스크롤 */
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (matched.length === 0 && !showCreate) {
    return (
      <div
        className="wiki-autocomplete"
        style={{ top: position.top, left: position.left }}
      >
        <div className="wiki-autocomplete-empty">
          검색 결과가 없어요. 계속 입력해서 새 문서 제목을 만들어보세요.
        </div>
      </div>
    );
  }

  return (
    <div
      className="wiki-autocomplete"
      style={{ top: position.top, left: position.left }}
      ref={listRef}
    >
      <div className="wiki-autocomplete-header">
        <i className="fa-solid fa-link" /> 문서 연결
      </div>
      {matched.map((doc, i) => (
        <button
          key={doc.id}
          type="button"
          data-idx={i}
          className={`wiki-autocomplete-item ${i === activeIdx ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(doc);
          }}
          onMouseEnter={() => setActiveIdx(i)}
        >
          <i className="fa-solid fa-file-lines" />
          <div className="wiki-autocomplete-body">
            <div className="wiki-autocomplete-title">{doc.title || '제목 없음'}</div>
            {doc.category && (
              <div className="wiki-autocomplete-sub">{doc.category}</div>
            )}
          </div>
        </button>
      ))}
      {showCreate && (
        <button
          type="button"
          data-idx={matched.length}
          className={`wiki-autocomplete-item wiki-autocomplete-create ${
            activeIdx === matched.length ? 'active' : ''
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect({ title: query.trim(), createNew: true });
          }}
          onMouseEnter={() => setActiveIdx(matched.length)}
        >
          <i className="fa-solid fa-plus" />
          <div className="wiki-autocomplete-body">
            <div className="wiki-autocomplete-title">
              "{query.trim()}" 새 문서 만들기
            </div>
            <div className="wiki-autocomplete-sub">
              빈 문서가 생성됩니다
            </div>
          </div>
        </button>
      )}
      <div className="wiki-autocomplete-footer">
        <kbd>↑↓</kbd> 이동 <kbd>↵</kbd> 선택 <kbd>Esc</kbd> 닫기
      </div>
    </div>
  );
}