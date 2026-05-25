// components/common/ShortcutHelpModal.jsx
// ? 키 누르면 뜨는 단축키 도움말 모달.

import Modal from './Modal';
import { useShortcut } from '../../contexts/ShortcutContext';

const NAV_GROUP = [
  { keys: ['g', 'd'], label: '대시보드' },
  { keys: ['g', 'b'], label: '게시판' },
  { keys: ['g', 'a'], label: '전자 결재' },
  { keys: ['g', 'm'], label: '메일' },
  { keys: ['g', 'p'], label: '프로젝트' },
  { keys: ['g', 's'], label: '일정' },
  { keys: ['g', 'w'], label: '위키' },
  { keys: ['g', 'o'], label: '조직도' },
  { keys: ['g', 'l'], label: '연차' },
  { keys: ['g', 'e'], label: '경비' },
  { keys: ['g', 'r'], label: '회의실' },
  { keys: ['g', 't'], label: '교육' },
  { keys: ['g', 'h'], label: 'INJOY Hub' },
  { keys: ['g', 'n'], label: 'Well-being' },
  { keys: ['g', 'f'], label: '자료실' },
];

const ACTION_GROUP = [
  { keys: ['⌘', 'K'],  altKeys: ['Ctrl', 'K'], label: '명령 팔레트 / 통합 검색' },
  { keys: ['/'],       label: '빠른 검색 열기' },
  { keys: ['?'],       label: '단축키 도움말' },
  { keys: ['c'],       label: '새로 만들기 (현재 페이지 기준)' },
  { keys: ['m'],       label: '메신저 열기' },
  { keys: ['\\'],      label: '사이드바 접기/펴기' },
  { keys: ['t'],       label: '다크모드 토글' },
  { keys: ['Esc'],     label: '모달/오버레이 닫기' },
];

function Kbd({ children }) {
  return <kbd className="shortcut-kbd">{children}</kbd>;
}

function KeyCombo({ keys, altKeys }) {
  return (
    <span className="shortcut-combo">
      {keys.map((k, i) => (
        <span key={i}>
          {i > 0 && <span className="shortcut-plus">+</span>}
          <Kbd>{k}</Kbd>
        </span>
      ))}
      {altKeys && (
        <>
          <span className="shortcut-or">또는</span>
          {altKeys.map((k, i) => (
            <span key={i}>
              {i > 0 && <span className="shortcut-plus">+</span>}
              <Kbd>{k}</Kbd>
            </span>
          ))}
        </>
      )}
    </span>
  );
}

export default function ShortcutHelpModal() {
  const { helpOpen, setHelpOpen } = useShortcut();

  return (
    <Modal
      isOpen={helpOpen}
      onClose={() => setHelpOpen(false)}
      size="lg"
      title="키보드 단축키"
    >
      <div className="shortcut-help">
        <p className="shortcut-help-intro">
          입력 필드 바깥에서 키를 눌러보세요. <Kbd>?</Kbd> 를 다시 누르면 닫혀요.
        </p>

        <div className="shortcut-help-cols">
          {/* 페이지 이동 */}
          <section className="shortcut-help-section">
            <h4>
              <i className="fa-solid fa-compass" /> 페이지 이동
            </h4>
            <p className="shortcut-help-hint">
              <Kbd>g</Kbd> 누른 뒤 1초 안에 다음 키를 입력
            </p>
            <ul className="shortcut-help-list">
              {NAV_GROUP.map((item) => (
                <li key={item.keys.join('')}>
                  <KeyCombo keys={item.keys} />
                  <span className="shortcut-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 액션 */}
          <section className="shortcut-help-section">
            <h4>
              <i className="fa-solid fa-bolt" /> 액션
            </h4>
            <p className="shortcut-help-hint">단일 키로 즉시 실행</p>
            <ul className="shortcut-help-list">
              {ACTION_GROUP.map((item, i) => (
                <li key={i}>
                  <KeyCombo keys={item.keys} altKeys={item.altKeys} />
                  <span className="shortcut-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="shortcut-help-foot">
          <i className="fa-solid fa-circle-info" />
          입력창 안에서는 단축키가 작동하지 않아 텍스트 입력에 방해가 되지 않아요.
        </p>
      </div>
    </Modal>
  );
}