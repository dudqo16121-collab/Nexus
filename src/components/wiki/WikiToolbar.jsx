// components/wiki/WikiToolbar.jsx
// 리치 텍스트 툴바 — document.execCommand 기반.
// (deprecated 표시지만 모든 브라우저에서 여전히 잘 동작하고, 외부 라이브러리 없이 가장 간단)

import { useState } from 'react';

const TOOLS = [
  { type: 'heading', level: 1, icon: 'fa-heading', label: '제목 1', shortcut: '# ' },
  { type: 'heading', level: 2, icon: 'fa-heading', label: '제목 2', size: 'sm', shortcut: '## ' },
  { type: 'heading', level: 3, icon: 'fa-heading', label: '제목 3', size: 'xs', shortcut: '### ' },
  { type: 'divider' },
  { type: 'bold',         icon: 'fa-bold',          label: '굵게',       shortcut: 'Ctrl+B' },
  { type: 'italic',       icon: 'fa-italic',        label: '이탤릭',     shortcut: 'Ctrl+I' },
  { type: 'underline',    icon: 'fa-underline',     label: '밑줄',       shortcut: 'Ctrl+U' },
  { type: 'strikethrough',icon: 'fa-strikethrough', label: '취소선' },
  { type: 'divider' },
  { type: 'ul',           icon: 'fa-list-ul',       label: '순서 없는 목록' },
  { type: 'ol',           icon: 'fa-list-ol',       label: '순서 있는 목록' },
  { type: 'quote',        icon: 'fa-quote-right',   label: '인용' },
  { type: 'code',         icon: 'fa-code',          label: '인라인 코드' },
  { type: 'codeblock',    icon: 'fa-file-code',     label: '코드 블록' },
  { type: 'divider' },
  { type: 'link',         icon: 'fa-link',          label: '링크' },
  { type: 'hr',           icon: 'fa-minus',         label: '구분선' },
  { type: 'divider' },
  { type: 'clear',        icon: 'fa-eraser',        label: '서식 제거' },
];

export default function WikiToolbar({ disabled, contentRef, onChange }) {

  /* execCommand 래퍼 — 실행 후 onChange 트리거 */
  const exec = (command, value = null) => {
    if (disabled) return;
    contentRef.current?.focus();
    document.execCommand(command, false, value);
    onChange?.();
  };

  /* 블록 단위 — 헤딩/인용/코드블록 */
  const setBlock = (tag) => {
    exec('formatBlock', `<${tag}>`);
  };

  /* 액션 실행 */
  const handleAction = (tool) => {
    switch (tool.type) {
      case 'heading':    setBlock(`h${tool.level}`); break;
      case 'bold':       exec('bold'); break;
      case 'italic':     exec('italic'); break;
      case 'underline':  exec('underline'); break;
      case 'strikethrough': exec('strikeThrough'); break;
      case 'ul':         exec('insertUnorderedList'); break;
      case 'ol':         exec('insertOrderedList'); break;
      case 'quote':      setBlock('blockquote'); break;
      case 'code':       {
        /* 선택 영역을 <code>로 감싸기 */
        const sel = window.getSelection();
        if (!sel || !sel.toString()) return;
        exec('insertHTML', `<code>${escapeHtml(sel.toString())}</code>`);
        break;
      }
      case 'codeblock':  setBlock('pre'); break;
      case 'link': {
        const url = window.prompt('링크 URL을 입력하세요:', 'https://');
        if (url) exec('createLink', url);
        break;
      }
      case 'hr':         exec('insertHorizontalRule'); break;
      case 'clear':      exec('removeFormat'); break;
      default: break;
    }
  };

  return (
    <div className="wiki-toolbar">
      {TOOLS.map((tool, i) => {
        if (tool.type === 'divider') {
          return <div key={`d-${i}`} className="wiki-toolbar-divider" />;
        }
        return (
          <button
            key={`${tool.type}-${tool.level || ''}-${i}`}
            type="button"
            className={`wiki-toolbar-btn wiki-toolbar-btn-${tool.size || 'md'}`}
            onMouseDown={(e) => e.preventDefault()} /* 셀렉션 유지 */
            onClick={() => handleAction(tool)}
            disabled={disabled}
            title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
          >
            <i className={`fa-solid ${tool.icon}`} />
            {tool.type === 'heading' && (
              <span className="wiki-toolbar-num">{tool.level}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* HTML escape */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}