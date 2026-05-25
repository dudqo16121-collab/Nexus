// contexts/ShortcutContext.jsx
// 글로벌 키보드 단축키 시스템.
//
// - 시퀀스 단축키 (g + d, g + b 등): 1초 안에 두 번째 키 누르면 발동
// - 단일 키 단축키 (?, /, c, m 등): 즉시 발동
// - 입력 필드 (input/textarea/contentEditable) 포커스 시 자동 비활성
// - 모달이 열려있을 때도 자동 비활성 (Esc 제외)
// - 단축키 헬퍼 모달 상태 관리

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessenger } from './MessengerContext';

const ShortcutContext = createContext(null);

const SEQUENCE_TIMEOUT_MS = 1200;

/* 라우트 매핑 — g + ? 시퀀스 */
const GOTO_MAP = {
  d: { path: '/',            label: '대시보드' },
  b: { path: '/board',       label: '게시판' },
  a: { path: '/approval',    label: '전자 결재' },
  m: { path: '/mail',        label: '메일함' },
  p: { path: '/project',     label: '프로젝트' },
  s: { path: '/schedule',    label: '일정' },
  w: { path: '/wiki',        label: '위키' },
  o: { path: '/orgchart',    label: '조직도' },
  l: { path: '/leave',       label: '연차' },
  e: { path: '/expenses',    label: '경비' },
  r: { path: '/meetingroom', label: '회의실' },
  t: { path: '/training',    label: '교육' },
  h: { path: '/injoyhub',    label: 'INJOY Hub' },
  n: { path: '/wellbeing',   label: 'Well-being' },
  f: { path: '/resource',    label: '자료실' },
};

/* 입력 필드 여부 판별 */
function isEditingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

/* 모달/팔레트가 열려있는지 — Esc 외 단축키 차단용 */
function isAnyOverlayOpen() {
  return !!(
    document.querySelector('.cmd-palette-overlay') ||
    document.querySelector('.modal-overlay.open') ||
    document.querySelector('.modal-backdrop')
  );
}

export function ShortcutProvider({ children }) {
  const navigate = useNavigate();
  const messenger = useMessenger();

  /* 도움말 모달 상태 */
  const [helpOpen, setHelpOpen] = useState(false);

  /* 사이드바 토글 — localStorage 직접 제어 (Sidebar 컴포넌트가 읽음) */
  const toggleSidebar = useCallback(() => {
    const current = localStorage.getItem('nexus_sb_collapsed') === '1';
    localStorage.setItem('nexus_sb_collapsed', current ? '0' : '1');
    /* Sidebar 컴포넌트가 useState 로 보관 중이라 storage event 트리거 필요 */
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'nexus_sb_collapsed',
      newValue: current ? '0' : '1',
    }));
    /* 직접 클래스 토글 — 즉시 반영 */
    const aside = document.querySelector('aside.sidebar');
    if (aside) aside.classList.toggle('collapsed');
  }, []);

  /* 다크모드 토글 */
  const toggleDarkMode = useCallback(() => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, []);

  /* 컨텍스트별 "새로 만들기" — 현재 URL 보고 적절한 액션 */
  const contextualCreate = useCallback(() => {
    const path = window.location.pathname;
    /* 각 페이지마다 "새 글" 버튼이 다 다른 위치/방식이라
       전역 이벤트로 통일. 각 페이지에서 useEffect 로 listen. */
    window.dispatchEvent(new CustomEvent('nexus:shortcut:create', {
      detail: { path },
    }));
  }, []);

  /* 검색 포커스 — CommandPalette 열기 */
  const focusSearch = useCallback(() => {
    /* useSearch().openPalette() 를 호출하고 싶지만 의존 줄이려고 이벤트로 */
    window.dispatchEvent(new CustomEvent('nexus:shortcut:open-palette'));
  }, []);

  /* 시퀀스 추적 */
  const pendingKeyRef = useRef(null);
  const pendingTimerRef = useRef(null);
  const [pendingHint, setPendingHint] = useState(null);

  const clearPending = useCallback(() => {
    pendingKeyRef.current = null;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    setPendingHint(null);
  }, []);

  /* 키 이벤트 핸들러 */
  useEffect(() => {
    const handler = (e) => {
      const key = e.key;
      const target = e.target;

      /* Esc 는 항상 통과 — 다른 곳에서 처리 */
      if (key === 'Escape') return;

      /* IME 조합 중 무시 */
      if (e.isComposing) return;

      /* 입력 필드면 무시 */
      if (isEditingTarget(target)) return;

      /* 메타 키 조합은 무시 (⌘K 등은 별도 핸들러에서) */
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      /* 오버레이가 열려있으면 무시 */
      if (isAnyOverlayOpen()) return;

      /* === 시퀀스 단축키: g + ? === */
      if (pendingKeyRef.current === 'g') {
        const goto = GOTO_MAP[key.toLowerCase()];
        if (goto) {
          e.preventDefault();
          clearPending();
          navigate(goto.path);
          return;
        }
        /* g 다음에 매칭 없으면 시퀀스 취소 */
        clearPending();
        return;
      }

      /* === 단일 키 액션 === */
      switch (key) {
        case 'g':
          /* 시퀀스 시작 */
          e.preventDefault();
          pendingKeyRef.current = 'g';
          setPendingHint('g');
          pendingTimerRef.current = setTimeout(() => {
            clearPending();
          }, SEQUENCE_TIMEOUT_MS);
          return;

        case '?':
          e.preventDefault();
          setHelpOpen(true);
          return;

        case '/':
          e.preventDefault();
          focusSearch();
          return;

        case 'c':
          e.preventDefault();
          contextualCreate();
          return;

        case 'm':
          e.preventDefault();
          if (messenger?.open) messenger.open();
          return;

        case '\\':
          e.preventDefault();
          toggleSidebar();
          return;

        case 't':
          e.preventDefault();
          toggleDarkMode();
          return;

        default:
          return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [
    navigate,
    messenger,
    clearPending,
    contextualCreate,
    focusSearch,
    toggleSidebar,
    toggleDarkMode,
  ]);

  /* ⌘K 시 CommandPalette 열기 신호 받는 헬퍼 — SearchContext 가 listen */
  /* (SearchContext 에서 이미 ⌘K 핸들링하고 있으므로 별도 처리 없이 통과) */

  return (
    <ShortcutContext.Provider
      value={{
        helpOpen,
        setHelpOpen,
        pendingHint,
        GOTO_MAP,
      }}
    >
      {children}
    </ShortcutContext.Provider>
  );
}

export function useShortcut() {
  const ctx = useContext(ShortcutContext);
  if (!ctx) throw new Error('useShortcut must be used within ShortcutProvider');
  return ctx;
}