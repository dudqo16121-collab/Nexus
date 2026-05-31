import { useState, useEffect, useRef } from 'react';
import { useMessenger } from '../../contexts/MessengerContext';
import KanbanModal from './KanbanModal';
import NotificationModal from './NotificationModal';
import ApiModal from './ApiModal';
import StickyModal from './StickyModal';
import TimerModal from './TimerModal';
import WikiModal from "./WikiModal";
import { useToast } from '../../contexts/ToastContext';
import ActionCenterPanel from './ActionCenterPanel';
import KudosBoardPanel from './KudosBoardPanel';
import { createPortal } from 'react-dom';

const COMING_SOON = () => toast.info('이 기능은 다음 작업에서 구현될 예정입니다.');

export default function QuickToolbar() {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isKanbanOpen, setIsKanbanOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isApiOpen, setIsApiOpen] = useState(false);
  const [isStickyOpen, setIsStickyOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [wikiOpen, setWikiOpen] = useState(false);
  const toolbarRef = useRef(null);
  const triggerRef = useRef(null);
  const { open: openMessenger } = useMessenger();
  const [isActionCenterOpen, setIsActionCenterOpen] = useState(false);
  const [isKudosOpen, setIsKudosOpen] = useState(false);
  /* 외부 클릭 감지 */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        toolbarRef.current && !toolbarRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsOpen(false);
  };

  const ITEMS = [
    { label: '기본 유틸리티', isLabel: true },
    { icon: 'fa-expand', text: '전체 화면 전환',  onClick: toggleFullscreen },
    { icon: 'fa-bell', text: '알림 센터 보기',
  onClick: () => { setIsNotifOpen(true); setIsOpen(false); } },
    { icon: 'fa-note-sticky', iconColor: '#f1c40f', text: '빠른 메모 작성',
  onClick: () => { setIsStickyOpen(true); setIsOpen(false); } },
    { icon: 'fa-stopwatch',   iconColor: 'var(--danger)', text: '집중 모드 타이머',
  onClick: () => { setIsTimerOpen(true); setIsOpen(false); } },

    { label: '업무 관리', isLabel: true },
    { icon: 'fa-diagram-project', iconColor: 'var(--primary-color)', text: '칸반보드 전체 보기',
  onClick: () => { setIsKanbanOpen(true); setIsOpen(false); } },
    { icon: 'fa-file-contract', iconColor: '#9d4edd', text: '사내 위키', onClick: () => setWikiOpen(true) },
    { icon: 'fa-code-branch', iconColor: 'var(--success)', text: 'API 연동 센터',
  onClick: () => { setIsApiOpen(true); setIsOpen(false); } },

    { label: '스마트 협업 도구', isLabel: true },
    { icon: 'fa-list-check', iconColor: 'var(--primary-color)', text: '나의 액션 아이템',
      onClick: () => { setIsActionCenterOpen(true); setIsOpen(false); } },
    { icon: 'fa-heart', iconColor: '#f72585', text: '칭찬 보드',
      onClick: () => { setIsKudosOpen(true); setIsOpen(false); } },
    { icon: 'fa-video',      iconColor: 'var(--success)', text: '즉석 화상회의 개설', onClick: COMING_SOON },
    { icon: 'fa-pen-ruler',  iconColor: 'var(--primary-color)', text: '팀 화이트보드 캔버스', onClick: COMING_SOON },
    { icon: 'fa-robot',      iconColor: '#9d4edd', text: 'AI 일일 업무 요약', onClick: COMING_SOON },
    { icon: 'fa-language',   iconColor: 'var(--warning)', text: '실시간 문서 번역기', onClick: COMING_SOON },
    { icon: 'fa-comments',   iconColor: 'var(--primary-color)', text: '사내 메신저 열기',
      onClick: () => { openMessenger(); setIsOpen(false); } },
  ];

return (
    <>
      {createPortal(
        <>
          {/* 토글 버튼 */}
          <div ref={triggerRef} className="toolbar-toggle" onClick={() => setIsOpen(true)}>
            <i className="fa-solid fa-plus"></i>
          </div>

          {/* 슬라이드 패널 */}
          <div ref={toolbarRef} className={`right-toolbar ${isOpen ? 'open' : ''}`}>
            <div className="toolbar-header">
              <h4>
                <i className="fa-solid fa-bolt" style={{ color: 'var(--warning)' }}></i>
                퀵 툴바
              </h4>
              <i
                className="fa-solid fa-xmark"
                style={{ cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
                onClick={() => setIsOpen(false)}
              ></i>
            </div>
            <div className="toolbar-content">
              {ITEMS.map((item, idx) =>
                item.isLabel ? (
                  <div key={idx} className="toolbar-label" style={{ marginTop: idx === 0 ? 0 : 20 }}>
                    {idx > 0 && <div className="toolbar-divider"></div>}
                    {item.label}
                  </div>
                ) : (
                  <div key={idx} className="toolbar-item" onClick={item.onClick}>
                    <i className={`fa-solid ${item.icon}`} style={item.iconColor ? { color: item.iconColor } : undefined}></i>
                    {item.text}
                  </div>
                )
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 모달들 — 자기 자리에서 렌더 (모달 라이브러리가 알아서 포털) */}
      <KanbanModal isOpen={isKanbanOpen} onClose={() => setIsKanbanOpen(false)} />
      <NotificationModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      <ApiModal isOpen={isApiOpen} onClose={() => setIsApiOpen(false)} />
      <StickyModal isOpen={isStickyOpen} onClose={() => setIsStickyOpen(false)} />
      <TimerModal isOpen={isTimerOpen} onClose={() => setIsTimerOpen(false)} />
      <WikiModal isOpen={wikiOpen} onClose={() => setWikiOpen(false)} />
      <ActionCenterPanel isOpen={isActionCenterOpen} onClose={() => setIsActionCenterOpen(false)} />
      <KudosBoardPanel isOpen={isKudosOpen} onClose={() => setIsKudosOpen(false)} />
    </>
  );
}