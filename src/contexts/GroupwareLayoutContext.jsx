// contexts/GroupwareLayoutContext.jsx
// 그룹웨어 위젯 레이아웃 상태 관리.
// - 12컬럼 react-grid-layout 좌표 (x, y, w, h)
// - 접힘 상태 (collapsed)
// - 편집 모드 토글
// - localStorage 영속

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const GroupwareLayoutContext = createContext(null);

const STORAGE_KEY = 'groupware_layout_v2';
const COLLAPSE_KEY = 'groupware_collapsed_v2';

/* 기본 레이아웃 — 위젯 ID, 위치, 크기 */
export const DEFAULT_LAYOUT = [
  // 1행 — 팀 현황 좁게, 공동작업 넓게
  { i: 'team-presence', x: 0, y: 0,  w: 4,  h: 6, minW: 2, minH: 2 },
  { i: 'cowork',        x: 4, y: 0,  w: 8,  h: 8, minW: 3, minH: 2 },

  // 2행 — 도움 요청 + 스탠드업 반반
  { i: 'ask',           x: 0, y: 8,  w: 6,  h: 9, minW: 3, minH: 2 },
  { i: 'standup',       x: 6, y: 8,  w: 6,  h: 9, minW: 3, minH: 2 },

  // 3행 — 아이디어 보드 살짝 넓게 + 공유 문서함
  { i: 'idea',          x: 0, y: 17, w: 7,  h: 10, minW: 3, minH: 2 },
  { i: 'codocs',        x: 7, y: 17, w: 5,  h: 10, minW: 3, minH: 2 },
];
/* 접힌 상태일 때 강제 적용할 높이 (헤더만) */
export const COLLAPSED_HEIGHT = 1;

export function GroupwareLayoutProvider({ children }) {
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_LAYOUT;
      const parsed = JSON.parse(saved);
      /* 신규 위젯이 추가됐을 수 있으니 누락된 건 기본값에서 보충 */
      const map = new Map(parsed.map((it) => [it.i, it]));
      return DEFAULT_LAYOUT.map((d) => map.get(d.i) || d);
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [editMode, setEditMode] = useState(false);

  /* 영속 */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {}
  }, [layout]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  /* 레이아웃 갱신 — 접힘 상태인 위젯은 h를 강제로 유지 */
  const updateLayout = useCallback(
    (newLayout) => {
      const adjusted = newLayout.map((item) => {
        if (collapsed[item.i]) {
          return { ...item, h: COLLAPSED_HEIGHT, minH: COLLAPSED_HEIGHT };
        }
        /* 펼쳐진 상태로 돌아갈 때를 위해 default minH 복원 */
        const def = DEFAULT_LAYOUT.find((d) => d.i === item.i);
        return { ...item, minH: def?.minH || 3 };
      });
      setLayout(adjusted);
    },
    [collapsed]
  );

  /* 접기 토글 */
  const toggleCollapse = useCallback(
    (widgetId) => {
      setCollapsed((prev) => {
        const isNowCollapsed = !prev[widgetId];
        const next = { ...prev, [widgetId]: isNowCollapsed };

        /* 동시에 layout도 즉시 갱신 (h 조정) */
        setLayout((prevLayout) =>
          prevLayout.map((item) => {
            if (item.i !== widgetId) return item;
            if (isNowCollapsed) {
              return { ...item, h: COLLAPSED_HEIGHT, minH: COLLAPSED_HEIGHT };
            }
            /* 펼칠 때 기본 높이로 복원 */
            const def = DEFAULT_LAYOUT.find((d) => d.i === widgetId);
            return { ...item, h: def?.h || 6, minH: def?.minH || 3 };
          })
        );
        return next;
      });
    },
    []
  );

  const isCollapsed = useCallback(
    (widgetId) => !!collapsed[widgetId],
    [collapsed]
  );

  /* 기본값으로 초기화 */
  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    setCollapsed({});
  }, []);

  const toggleEditMode = useCallback(() => setEditMode((p) => !p), []);

  /* 접힌 위젯은 react-grid-layout에 전달할 때 h를 강제 */
  const effectiveLayout = useMemo(
    () =>
      layout.map((item) =>
        collapsed[item.i]
          ? { ...item, h: COLLAPSED_HEIGHT, minH: COLLAPSED_HEIGHT }
          : item
      ),
    [layout, collapsed]
  );

  return (
    <GroupwareLayoutContext.Provider
      value={{
        layout: effectiveLayout,
        updateLayout,
        collapsed,
        isCollapsed,
        toggleCollapse,
        editMode,
        toggleEditMode,
        resetLayout,
      }}
    >
      {children}
    </GroupwareLayoutContext.Provider>
  );
}

export function useGroupwareLayout() {
  const ctx = useContext(GroupwareLayoutContext);
  if (!ctx) {
    throw new Error('useGroupwareLayout must be used within GroupwareLayoutProvider');
  }
  return ctx;
}