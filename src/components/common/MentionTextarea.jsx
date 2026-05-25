// components/common/MentionTextarea.jsx
// @멘션 자동완성을 지원하는 textarea.
// 원본 bindMentionAutocomplete (script.js 2888~2934) 의 React 이관.
//
// 사용법:
//   <MentionTextarea
//     value={text}
//     onChange={setText}
//     users={allUsers}             // [{ id, name, avatar_url }]
//     rows={2}
//     placeholder="..."
//   />
//
// 동작:
//   - 입력 중 캐럿 직전 토큰이 /@([\w가-힣]*)$/ 매칭이면 드롭다운 표시
//   - 후보 최대 6명 (이름 부분 매칭, 대소문자 무시)
//   - 키보드: ↑↓ 이동, Enter/Tab 선택, Esc 닫기
//   - 마우스: hover 활성, 클릭 선택
//   - 선택 시 @keyword → @이름  으로 치환, 캐럿은 치환 텍스트 끝으로 이동
//   - blur 시 200ms 후 닫음 (드롭다운 클릭이 먼저 들어올 수 있게)
//   - 드롭다운 위치: textarea 위 우선, 위 공간 부족하면 아래

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* 원본 assigneeAvatar 이관 */
function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  if (u?.avatar) return `https://i.pravatar.cc/150?img=${u.avatar}`;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

export default function MentionTextarea({
  value,
  onChange,
  users = [],
  rows = 2,
  placeholder,
  className,
  style,
  onKeyDown: onKeyDownProp,
  ...rest
}) {
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const blurTimerRef = useRef(null);

  /* 드롭다운 상태 */
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  /* 드롭다운 위치 (textarea 기준) — fixed 좌표 */
  const [pos, setPos] = useState({ left: 0, top: 0, placement: 'above' });
  /* 현재 매칭된 @keyword 범위 — 선택 시 어디부터 어디까지 치환할지 */
  const matchRef = useRef(null); // { start, end, keyword }

  /* 캐럿 직전 토큰을 검사해서 드롭다운 상태 갱신 */
  const updateMention = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const caret = ta.selectionStart;
    const before = ta.value.slice(0, caret);
    const m = before.match(/@([\w가-힣]*)$/);

    if (!m) {
      matchRef.current = null;
      setOpen(false);
      return;
    }
    const keyword = m[1].toLowerCase();
    const start = caret - m[0].length;
    const end = caret;

    const found = users
      .filter((u) => (u.name || '').toLowerCase().includes(keyword))
      .slice(0, 6);

    if (found.length === 0) {
      setOpen(false);
      return;
    }

    matchRef.current = { start, end, keyword };
    setCandidates(found);
    setActiveIdx(0);
    setOpen(true);
  }, [users]);

  /* 드롭다운 좌표 계산 — textarea 의 캐럿 근처에 띄우기 어려워서
     원본처럼 textarea 자체 좌표 기준으로 위 또는 아래에 정렬한다. */
  useLayoutEffect(() => {
    if (!open) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const rect = ta.getBoundingClientRect();
    const itemH = 40;
    const dropdownH = Math.min(220, candidates.length * itemH + 12);
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    const placement = spaceAbove > dropdownH + 8 || spaceAbove > spaceBelow ? 'above' : 'below';
    const top = placement === 'above'
      ? rect.top - 8 - dropdownH
      : rect.bottom + 8;
    setPos({ left: rect.left, top, placement });
  }, [open, candidates.length]);

  /* 선택 적용 */
  const applyCandidate = useCallback(
    (user) => {
      const ta = textareaRef.current;
      const match = matchRef.current;
      if (!ta || !match) return;

      const before = ta.value.slice(0, match.start);
      const after = ta.value.slice(match.end);
      const insert = `@${user.name} `;
      const newValue = before + insert + after;
      const newCaret = (before + insert).length;

      onChange(newValue);
      setOpen(false);
      matchRef.current = null;

      // 캐럿 위치 복원 — value 반영 후 다음 tick
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCaret, newCaret);
        }
      });
    },
    [onChange]
  );

  /* 키보드 핸들러 */
  const handleKeyDown = useCallback(
    (e) => {
      if (open && candidates.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIdx((i) => (i + 1) % candidates.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIdx((i) => (i - 1 + candidates.length) % candidates.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          applyCandidate(candidates[activeIdx]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setOpen(false);
          return;
        }
      }
      // 사용자가 onKeyDown 핸들러를 또 넘긴 경우 전달
      onKeyDownProp?.(e);
    },
    [open, candidates, activeIdx, applyCandidate, onKeyDownProp]
  );

  /* 입력 변경 */
  const handleChange = (e) => {
    onChange(e.target.value);
    // value 가 다음 렌더에 반영되므로 updateMention 은 effect 에서 또 한 번 호출
    // 여기서는 즉시 한 번 호출해 반응성을 높임 (selectionStart 는 e.target 에서 바로 읽힘)
    updateMention();
  };

  /* selection 변경(클릭으로 캐럿 이동 등)도 감지 */
  const handleSelect = () => updateMention();

  /* blur — 드롭다운 클릭 처리할 시간을 주고 닫기 */
  const handleBlur = () => {
    clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => setOpen(false), 200);
  };
  const handleFocus = () => {
    clearTimeout(blurTimerRef.current);
  };

  /* 외부 클릭으로 닫기 (드롭다운 자체 클릭은 onMouseDown preventDefault 로 보호) */
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      const ta = textareaRef.current;
      const dd = dropdownRef.current;
      if (ta?.contains(e.target)) return;
      if (dd?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  /* unmount 시 타이머 정리 */
  useEffect(() => () => clearTimeout(blurTimerRef.current), []);

  return (
    <>
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        placeholder={placeholder}
        className={className}
        style={style}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...rest}
      />
      {open && candidates.length > 0 && (
        <div
          ref={dropdownRef}
          className="pm-mention-dropdown"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
          }}
          /* 드롭다운 내부 클릭 시 textarea 의 blur 가 먼저 발화돼 닫혀버리는 것을 방지 */
          onMouseDown={(e) => e.preventDefault()}
        >
          {candidates.map((u, i) => (
            <div
              key={u.id}
              className={`pm-mention-item${i === activeIdx ? ' active' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => applyCandidate(u)}
            >
              <div
                className="pm-tp-comment-avatar"
                style={{
                  width: 24,
                  height: 24,
                  backgroundImage: `url('${avatarUrl(u)}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <span>{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}