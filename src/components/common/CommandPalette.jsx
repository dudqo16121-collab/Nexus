// components/common/CommandPalette.jsx
// D2/D3 — 전역 명령 팔레트.
// ⌘K / Ctrl+K 로 열림. 검색어 입력 → 7개 소스 통합 검색 결과 + Quick Actions.

import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useSearch,
  SEARCH_CATEGORIES,
} from '../../contexts/SearchContext';

export default function CommandPalette() {
  const navigate = useNavigate();
  const {
    open,
    closePalette,
    query,
    setQuery,
    results,
    flatResults,
    totalCount,
    loading,
  } = useSearch();

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  /* 열릴 때 입력창 자동 포커스 + activeIdx 리셋 */
  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* 결과 바뀔 때 activeIdx 0으로 */
  useEffect(() => {
    setActiveIdx(0);
  }, [flatResults.length, query]);

  /* 활성 항목 스크롤 보이게 */
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  /* 카테고리별 그룹 (순서 유지) */
  const groups = useMemo(() => {
    const order = Object.keys(SEARCH_CATEGORIES).sort(
      (a, b) => SEARCH_CATEGORIES[a].order - SEARCH_CATEGORIES[b].order
    );
    return order
      .map((cat) => ({
        key: cat,
        meta: SEARCH_CATEGORIES[cat],
        items: results[cat] || [],
      }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  /* 평탄 리스트에서 (카테고리, 카테고리 내 인덱스) 찾기 */
  const findFlatIdx = (catKey, itemIdx) => {
    let count = 0;
    for (const g of groups) {
      if (g.key === catKey) return count + itemIdx;
      count += g.items.length;
    }
    return -1;
  };

  /* 항목 선택 (Enter / 클릭) */
  const handleSelect = (item) => {
    if (!item) return;
    closePalette();
    if (item.link) navigate(item.link);
  };

  /* 키보드 네비 */
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, totalCount - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(flatResults[activeIdx]);
    }
  };

  /* 오버레이 클릭 닫기 */
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) closePalette();
  };

  if (!open) return null;

  return (
    <div className="cmd-palette-overlay" onClick={handleOverlayClick}>
      <div className="cmd-palette" role="dialog" aria-label="통합 검색">
        {/* 검색 입력 */}
        <div className="cmd-palette-input-wrap">
          <i className="fa-solid fa-magnifying-glass cmd-palette-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="문서, 사람, 일정, 태스크 검색... (Esc로 닫기)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {loading && (
            <i className="fa-solid fa-spinner fa-spin cmd-palette-loading" />
          )}
          <kbd className="cmd-palette-kbd">ESC</kbd>
        </div>

        {/* 결과 영역 */}
        <div className="cmd-palette-results" ref={listRef}>
          {!query.trim() ? (
            <div className="cmd-palette-empty">
              <i className="fa-solid fa-keyboard" />
              <p>무엇이든 검색해보세요</p>
              <div className="cmd-palette-hints">
                <span><kbd>↑</kbd> <kbd>↓</kbd> 이동</span>
                <span><kbd>Enter</kbd> 선택</span>
                <span><kbd>Esc</kbd> 닫기</span>
              </div>
            </div>
          ) : loading && totalCount === 0 ? (
            <div className="cmd-palette-empty">
              <i className="fa-solid fa-spinner fa-spin" />
              <p>검색 중...</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="cmd-palette-empty">
              <i className="fa-regular fa-face-frown" />
              <p>"<strong>{query}</strong>"에 대한 결과가 없어요</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="cmd-palette-group">
                <div className="cmd-palette-group-header">
                  <i
                    className={`fa-solid ${g.meta.icon}`}
                    style={{ color: g.meta.color }}
                  />
                  <span>{g.meta.label}</span>
                  <span className="cmd-palette-group-count">
                    {g.items.length}
                  </span>
                </div>
                {g.items.map((item, idx) => {
                  const flatIdx = findFlatIdx(g.key, idx);
                  const active = flatIdx === activeIdx;
                  return (
                    <button
                      key={`${g.key}-${item.id || idx}`}
                      type="button"
                      data-idx={flatIdx}
                      className={`cmd-palette-item ${active ? 'active' : ''}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIdx(flatIdx)}
                    >
                      <CmdItemIcon item={item} meta={g.meta} />
                      <div className="cmd-palette-item-body">
                        <div className="cmd-palette-item-title">
                          <HighlightText text={item.text} query={query} />
                          {item.extra && (
                            <span className="cmd-palette-item-tag">
                              {item.extra}
                            </span>
                          )}
                        </div>
                        {(item.sub || item.snippet) && (
                          <div className="cmd-palette-item-sub">
                            {item.sub && <span>{item.sub}</span>}
                            {item.snippet && (
                              <span className="cmd-palette-item-snippet">
                                · <HighlightText text={item.snippet} query={query} />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {active && (
                        <kbd className="cmd-palette-item-kbd">↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* 하단 푸터 */}
        {totalCount > 0 && (
          <div className="cmd-palette-footer">
            <span>
              <kbd>↑</kbd><kbd>↓</kbd> 이동
            </span>
            <span>
              <kbd>↵</kbd> 선택
            </span>
            <span>
              <kbd>ESC</kbd> 닫기
            </span>
            <span className="cmd-palette-footer-total">
              총 {totalCount}개
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* 아이템 좌측 아이콘 — member 는 아바타, 나머지는 카테고리 아이콘 */
function CmdItemIcon({ item, meta }) {
  if (item.type === 'member' && item.avatar) {
    return (
      <img
        className="cmd-palette-item-avatar"
        src={item.avatar}
        alt=""
      />
    );
  }
  if (item.type === 'member') {
    return (
      <div
        className="cmd-palette-item-avatar"
        style={{ background: meta.color, color: '#fff' }}
      >
        {(item.text || '?').charAt(0)}
      </div>
    );
  }
  return (
    <div
      className="cmd-palette-item-icon"
      style={{ background: `${meta.color}15`, color: meta.color }}
    >
      <i className={`fa-solid ${item.icon || meta.icon}`} />
    </div>
  );
}

/* 검색어 하이라이트 */
function HighlightText({ text, query }) {
  if (!text || !query) return text || '';
  const lower = String(text).toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="cmd-palette-mark">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}