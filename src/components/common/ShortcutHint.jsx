// components/common/ShortcutHint.jsx
// g 키 눌렀을 때 화면 우하단에 잠깐 표시되는 힌트.

import { useShortcut } from '../../contexts/ShortcutContext';

export default function ShortcutHint() {
  const { pendingHint } = useShortcut();

  if (!pendingHint) return null;

  return (
    <div className="shortcut-hint" role="status" aria-live="polite">
      <kbd className="shortcut-kbd shortcut-kbd-lg">{pendingHint}</kbd>
      <span className="shortcut-hint-text">다음 키를 입력하세요...</span>
      <span className="shortcut-hint-sub">
        <kbd className="shortcut-kbd">d</kbd> 대시보드 ·
        <kbd className="shortcut-kbd">b</kbd> 게시판 ·
        <kbd className="shortcut-kbd">?</kbd> 전체 보기
      </span>
    </div>
  );
}