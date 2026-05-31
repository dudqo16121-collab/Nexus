// contexts/ScheduleDndContext.jsx
// 일정 드래그앤드롭 전역 상태 — 월/주/일 뷰에서 공유.

import { createContext, useContext, useState, useCallback } from 'react';

const ScheduleDndContext = createContext(null);

export function ScheduleDndProvider({ children }) {
  /* 현재 드래그 중인 일정 */
  const [draggingEvent, setDraggingEvent] = useState(null);
  /* 드롭 타겟 (드래그 오버 중인 날짜/시간) */
  const [dropTarget, setDropTarget] = useState(null);
  /* 확인 모달 상태 */
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    event: null,
    newStart: null,
    newEnd: null,
  });

  const startDrag = useCallback((event) => {
    setDraggingEvent(event);
  }, []);

  const endDrag = useCallback(() => {
    setDraggingEvent(null);
    setDropTarget(null);
  }, []);

  const updateDropTarget = useCallback((target) => {
    setDropTarget(target);
  }, []);

  const openConfirm = useCallback((event, newStart, newEnd) => {
    setConfirmModal({ open: true, event, newStart, newEnd });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal({ open: false, event: null, newStart: null, newEnd: null });
  }, []);

  return (
    <ScheduleDndContext.Provider
      value={{
        draggingEvent,
        dropTarget,
        startDrag,
        endDrag,
        updateDropTarget,
        confirmModal,
        openConfirm,
        closeConfirm,
      }}
    >
      {children}
    </ScheduleDndContext.Provider>
  );
}

export function useScheduleDnd() {
  const ctx = useContext(ScheduleDndContext);
  if (!ctx) throw new Error('useScheduleDnd must be used within ScheduleDndProvider');
  return ctx;
}