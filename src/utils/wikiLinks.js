// utils/wikiLinks.js
// 위키 링크 처리 헬퍼.
// HTML 안에 <a class="wiki-link" data-doc-id="..."> 형식으로 저장한다.
// 빈 링크(red link)는 data-doc-id 없이 data-doc-title 만 가짐.

/* 위키 링크 HTML 생성 */
export function makeWikiLinkHtml({ docId, title, exists }) {
  const safe = escapeHtml(title);
  if (exists && docId) {
    return `<a class="wiki-link" data-doc-id="${docId}" data-doc-title="${safe}" contenteditable="false">${safe}</a>`;
  }
  /* 빨간 링크 (문서 없음) */
  return `<a class="wiki-link wiki-link-red" data-doc-title="${safe}" contenteditable="false">${safe}</a>`;
}

/* HTML 텍스트 안에서 [[제목]] 패턴을 위키 링크로 변환 (서버에서 저장된 옛 데이터 호환) */
export function convertBracketsToLinks(html, documents) {
  if (!html) return html;
  return html.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const trimmed = title.trim();
    const found = documents.find((d) => d.title === trimmed);
    return makeWikiLinkHtml({
      docId: found?.id,
      title: trimmed,
      exists: !!found,
    });
  });
}

/* HTML escape */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* 커서 앞의 [[검색어 패턴 추출 — 자동완성 트리거 검사용 */
export function detectWikiLinkTrigger(node, offset) {
  if (!node || node.nodeType !== 3) return null;
  const text = node.textContent || '';
  const before = text.substring(0, offset);
  /* [[ 이후 ] 없이 검색어가 이어지는 경우 */
  const m = before.match(/\[\[([^\[\]\n]*)$/);
  if (!m) return null;
  return {
    query: m[1],
    startIndex: m.index, /* [[ 위치 */
    matchLength: m[0].length, /* [[검색어 전체 길이 */
    textNode: node,
  };
}