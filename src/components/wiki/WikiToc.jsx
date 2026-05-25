// components/wiki/WikiToc.jsx
// 우측 목차 (Table of Contents).
// 본문에서 h1/h2/h3 추출 + 클릭 시 스크롤 + 현재 섹션 하이라이트.

import { useEffect, useState, useRef } from 'react';

export default function WikiToc({ contentRef, content }) {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const observerRef = useRef(null);

  /* 본문 변경 시 헤딩 재추출 + ID 부여 */
  useEffect(() => {
    if (!contentRef.current) return;

    const found = [];
    const nodes = contentRef.current.querySelectorAll('h1, h2, h3');
    nodes.forEach((node, i) => {
      const text = node.textContent.trim();
      if (!text) return;
      /* ID 부여 (없으면) */
      let id = node.id;
      if (!id) {
        id = `toc-h-${i}-${text.slice(0, 20).replace(/\s+/g, '-')}`;
        node.id = id;
      }
      const level = parseInt(node.tagName.charAt(1), 10);
      found.push({ id, text, level });
    });

    setHeadings(found);
  }, [content, contentRef]);

  /* IntersectionObserver — 현재 보이는 섹션 추적 */
  useEffect(() => {
    if (!contentRef.current || headings.length === 0) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [headings, contentRef]);

  /* 클릭 → 스크롤 */
  const handleClick = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  if (headings.length === 0) {
    return (
      <aside className="wiki-toc wiki-toc-empty">
        <div className="wiki-toc-header">
          <i className="fa-solid fa-list-ul" /> 목차
        </div>
        <p className="wiki-toc-empty-text">
          헤딩(H1, H2, H3)을 추가하면<br />
          목차가 자동으로 생성돼요.
        </p>
      </aside>
    );
  }

  return (
    <aside className={`wiki-toc ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="wiki-toc-header"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>
          <i className="fa-solid fa-list-ul" /> 목차
          <span className="wiki-toc-count">{headings.length}</span>
        </span>
        <i className={`fa-solid fa-chevron-down wiki-toc-chev ${collapsed ? '' : 'rotated'}`} />
      </button>

      {!collapsed && (
        <ul className="wiki-toc-list">
          {headings.map((h) => (
            <li
              key={h.id}
              className={`wiki-toc-item wiki-toc-level-${h.level} ${
                activeId === h.id ? 'active' : ''
              }`}
              onClick={() => handleClick(h.id)}
            >
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}