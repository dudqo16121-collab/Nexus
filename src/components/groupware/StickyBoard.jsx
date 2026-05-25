import { useState, useRef } from 'react';
import { useSticky } from '../../contexts/StickyContext';

const COLOR_BGS = {
  '':       '#fef08a',
  'blue':   '#bae6fd',
  'green':  '#bbf7d0',
  'pink':   '#fecdd3',
  'purple': '#e9d5ff',
};

const COLOR_OPTIONS = ['', 'blue', 'green', 'pink', 'purple'];

/**
 * 화면 위에 떠다니는 포스트잇 보드
 * - 메모 드래그로 위치 이동
 * - 색상 변경
 * - 내용 수정
 * - 삭제
 */
export default function StickyBoard() {
  const { notes, deleteNote, updateNoteText, updateNoteColor, updateNotePosition } = useSticky();
  const [draggingId, setDraggingId] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  /* 드래그 시작 */
  const handleMouseDown = (e, note) => {
    /* textarea, button, 색상 버튼은 드래그 무시 */
    if (
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'BUTTON' ||
      e.target.classList.contains('sticky-color-btn')
    ) {
      return;
    }

    setDraggingId(note.id);
    /* 마우스와 메모 좌상단 사이 거리 기억 */
    dragOffset.current = {
      x: e.clientX - note.x,
      y: e.clientY - note.y,
    };
    e.preventDefault();
  };

  /* 드래그 중 — document 전체 mousemove 감지 */
  const handleMouseMove = (e) => {
    if (draggingId === null) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    updateNotePosition(draggingId, newX, newY);
  };

  /* 드래그 종료 */
  const handleMouseUp = () => {
    setDraggingId(null);
  };

  /* document에 이벤트 리스너 부착 (드래그 중일 때만) */
  if (draggingId !== null) {
    document.onmousemove = handleMouseMove;
    document.onmouseup = handleMouseUp;
  } else {
    document.onmousemove = null;
    document.onmouseup = null;
  }

  if (notes.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1500,
      }}
    >
      {notes.map((n) => (
        <div
          key={n.id}
          className="sticky-note"
          style={{
            left: n.x + 'px',
            top: n.y + 'px',
            background: COLOR_BGS[n.color] || COLOR_BGS[''],
            pointerEvents: 'all',
            zIndex: draggingId === n.id ? 9999 : 1500,
            cursor: draggingId === n.id ? 'grabbing' : 'move',
          }}
          onMouseDown={(e) => handleMouseDown(e, n)}
        >
          {/* 헤더 — 색상 버튼들 + 삭제 */}
          <div className="sticky-header">
            <div className="sticky-color-btns">
              {COLOR_OPTIONS.map((c) => (
                <div
                  key={c || 'yellow'}
                  className="sticky-color-btn"
                  style={{ background: COLOR_BGS[c] }}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateNoteColor(n.id, c);
                  }}
                ></div>
              ))}
            </div>
            <button
              className="sticky-delete"
              onClick={(e) => {
                e.stopPropagation();
                deleteNote(n.id);
              }}
            >
              ✕
            </button>
          </div>

          {/* 내용 — 수정 가능한 textarea */}
          <textarea
            className="sticky-textarea"
            value={n.text}
            onChange={(e) => updateNoteText(n.id, e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      ))}
    </div>
  );
}