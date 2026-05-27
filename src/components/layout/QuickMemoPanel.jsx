// components/layout/QuickMemoPanel.jsx
// 글로벌 빠른 메모 슬라이드 패널 — Topbar 우측 📝 아이콘으로 토글.
//
// 기능:
//  - 메인 메모 (자동 저장, 기존 QuickMemo 와 동일한 localStorage 키 사용)
//  - 빠른 할 일 (체크리스트, localStorage)
//  - 글자 수 / 마지막 저장 시각 표시

import { useEffect, useState, useRef } from 'react';

const MEMO_KEY = 'nexus_quick_memo';
const TODO_KEY = 'nexus_quick_todos';

function loadTodos() {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function QuickMemoPanel({ isOpen, onClose }) {
  const [memo, setMemo] = useState(
    () => localStorage.getItem(MEMO_KEY) || ''
  );
  const [todos, setTodos] = useState(loadTodos);
  const [newTodo, setNewTodo] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [tab, setTab] = useState('memo'); // 'memo' | 'todos'

  const saveTimerRef = useRef(null);

  /* 메모 자동 저장 */
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(MEMO_KEY, memo);
      setSavedAt(new Date());
    }, 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [memo]);

  /* 할 일 자동 저장 */
  useEffect(() => {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  }, [todos]);

  /* ESC 로 닫기 */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* 할 일 추가 */
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos((prev) => [
      ...prev,
      { id: Date.now(), text: newTodo.trim(), done: false },
    ]);
    setNewTodo('');
  };
  const toggleTodo = (id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };
  const removeTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };
  const clearCompleted = () => {
    if (!window.confirm('완료된 할 일을 모두 지울까요?')) return;
    setTodos((prev) => prev.filter((t) => !t.done));
  };
  const clearMemo = () => {
    if (!memo.trim()) return;
    if (!window.confirm('메모를 모두 지울까요? (되돌릴 수 없어요)')) return;
    setMemo('');
  };

  const memoLength = memo.length;
  const todoStats = {
    total: todos.length,
    done: todos.filter((t) => t.done).length,
  };

  /* 마지막 저장 시각 표시 */
  const savedAgo = savedAt
    ? (() => {
        const diff = Math.floor((Date.now() - savedAt.getTime()) / 1000);
        if (diff < 5) return '방금 저장됨';
        if (diff < 60) return `${diff}초 전 저장됨`;
        return savedAt.toLocaleTimeString('ko-KR', {
          hour: '2-digit', minute: '2-digit',
        }) + ' 저장됨';
      })()
    : null;

  return (
    <>
      <div
        className={`afp-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`afp-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="빠른 메모"
      >
        {/* 헤더 */}
        <header className="afp-header">
          <h3 className="afp-title">
            <i className="fa-solid fa-note-sticky" style={{ color: '#f59e0b' }} />
            빠른 메모
          </h3>
          <div className="afp-header-actions">
            <button
              type="button"
              className="afp-icon-btn"
              onClick={onClose}
              title="닫기"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </header>

        {/* 탭 */}
        <div className="afp-filters">
          <button
            type="button"
            className={`afp-chip ${tab === 'memo' ? 'active' : ''}`}
            onClick={() => setTab('memo')}
          >
            메모
            {memoLength > 0 && (
              <span className="afp-chip-count">{memoLength}</span>
            )}
          </button>
          <button
            type="button"
            className={`afp-chip ${tab === 'todos' ? 'active' : ''}`}
            onClick={() => setTab('todos')}
          >
            할 일
            {todoStats.total > 0 && (
              <span className="afp-chip-count">
                {todoStats.done}/{todoStats.total}
              </span>
            )}
          </button>
        </div>

        {/* 본문 */}
        <div className="afp-body" style={{ padding: 0 }}>
          {tab === 'memo' ? (
            <div className="qmp-memo-wrap">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="여기에 메모를 작성하세요...&#10;&#10;자동으로 저장돼요."
                className="qmp-memo-textarea"
                autoFocus
              />
              <div className="qmp-memo-footer">
                <span className="qmp-memo-status">
                  {savedAgo && (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up" />
                      {savedAgo}
                    </>
                  )}
                </span>
                {memo.length > 0 && (
                  <button
                    type="button"
                    className="qmp-clear-btn"
                    onClick={clearMemo}
                    title="메모 지우기"
                  >
                    <i className="fa-solid fa-eraser" /> 지우기
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="qmp-todos-wrap">
              {/* 새 할 일 입력 */}
              <div className="qmp-todo-input-row">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTodo();
                  }}
                  placeholder="새 할 일을 입력하고 Enter..."
                  className="qmp-todo-input"
                />
                <button
                  type="button"
                  className="qmp-todo-add"
                  onClick={addTodo}
                  disabled={!newTodo.trim()}
                  title="추가"
                >
                  <i className="fa-solid fa-plus" />
                </button>
              </div>

              {/* 할 일 리스트 */}
              <div className="qmp-todo-list">
                {todos.length === 0 ? (
                  <div className="afp-empty" style={{ padding: '40px 20px' }}>
                    <i className="fa-regular fa-square-check" />
                    <p>아직 할 일이 없어요</p>
                  </div>
                ) : (
                  todos.map((t) => (
                    <div
                      key={t.id}
                      className={`qmp-todo-item ${t.done ? 'done' : ''}`}
                    >
                      <label className="qmp-todo-check">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => toggleTodo(t.id)}
                        />
                        <span className="qmp-todo-box" />
                      </label>
                      <span className="qmp-todo-text">{t.text}</span>
                      <button
                        type="button"
                        className="qmp-todo-remove"
                        onClick={() => removeTodo(t.id)}
                        title="삭제"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 완료된 할 일 정리 */}
              {todoStats.done > 0 && (
                <div className="qmp-todo-footer">
                  <button
                    type="button"
                    className="qmp-clear-btn"
                    onClick={clearCompleted}
                  >
                    <i className="fa-solid fa-broom" />
                    완료된 {todoStats.done}건 정리
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}