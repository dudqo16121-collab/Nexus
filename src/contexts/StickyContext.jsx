import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const StickyContext = createContext(null);

const STORAGE_KEY = 'nexus_sticky_notes';

/* localStorage에서 초기 데이터 로드 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* localStorage에 저장 */
function saveToStorage(notes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save sticky notes:', e);
  }
}

export function StickyProvider({ children }) {
  /* useState 초기값을 함수로 — 첫 렌더 시 한 번만 실행됨 */
  const [notes, setNotes] = useState(loadFromStorage);

  /* notes가 바뀔 때마다 자동으로 localStorage 저장 */
  useEffect(() => {
    saveToStorage(notes);
  }, [notes]);

  /* 메모 추가 */
  const addNote = useCallback((text, color = '') => {
    const newNote = {
      id: Date.now(),
      text,
      color,
      /* 랜덤 위치 — 화면 중앙 근처 */
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200,
    };
    setNotes((prev) => [...prev, newNote]);
  }, []);

  /* 메모 삭제 */
  const deleteNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /* 메모 내용 수정 */
  const updateNoteText = useCallback((id, text) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  }, []);

  /* 메모 색상 변경 */
  const updateNoteColor = useCallback((id, color) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
  }, []);

  /* 메모 위치 변경 (드래그) */
  const updateNotePosition = useCallback((id, x, y) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }, []);

  return (
    <StickyContext.Provider
      value={{ notes, addNote, deleteNote, updateNoteText, updateNoteColor, updateNotePosition }}
    >
      {children}
    </StickyContext.Provider>
  );
}

export const useSticky = () => {
  const ctx = useContext(StickyContext);
  if (!ctx) throw new Error('useSticky must be used within StickyProvider');
  return ctx;
};