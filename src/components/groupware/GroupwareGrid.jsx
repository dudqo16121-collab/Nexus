// components/groupware/GroupwareGrid.jsx
import { useEffect, useRef, useState } from 'react';
import { Responsive } from 'react-grid-layout';
import { useGroupwareLayout } from '../../contexts/GroupwareLayoutContext';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import TeamPresence  from './TeamPresence';
import CoWorkBoard   from './CoWorkBoard';
import AskBoard      from './AskBoard';
import StandupBoard  from './StandupBoard';
import IdeaBoard     from './IdeaBoard';
import CoDocs        from './CoDocs';
import WidgetWrapper from './WidgetWrapper';

const WIDGET_MAP = {
  'team-presence': { component: TeamPresence, title: '팀 활동 현황',   icon: 'fa-users',            iconColor: 'var(--primary-color)' },
  cowork:          { component: CoWorkBoard,  title: '공동 작업 세션', icon: 'fa-handshake-angle', iconColor: '#06d6a0' },
  ask:             { component: AskBoard,     title: '요청·도움 게시판', icon: 'fa-hand',          iconColor: '#f59e0b' },
  standup:         { component: StandupBoard, title: '오늘의 스탠드업', icon: 'fa-mug-saucer',     iconColor: '#f59e0b' },
  idea:            { component: IdeaBoard,    title: '아이디어 보드',   icon: 'fa-lightbulb',     iconColor: '#f59e0b' },
  codocs:          { component: CoDocs,       title: '공유 문서함',     icon: 'fa-folder',        iconColor: '#8338ec' },
};

export default function GroupwareGrid() {
  const { layout, updateLayout, editMode } = useGroupwareLayout();
  const containerRef = useRef(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

    /* 편집 모드 아닐 때 모든 드래그 이벤트 원천 차단 */
  const handleMouseDownCapture = (e) => {
    if (editMode) return;
    /* 버튼/입력/링크/접기 토글 등은 클릭 허용 */
    const clickable = e.target.closest('button, a, input, textarea, select, [role="button"]');
    if (clickable) return;
    /* 그 외에는 mousedown 전파 차단 → 라이브러리가 드래그 시작 못 함 */
    e.stopPropagation();
  };

  return (
<div
      ref={containerRef}
      className="groupware-grid-wrapper"
      onMouseDownCapture={handleMouseDownCapture}
      onTouchStartCapture={handleMouseDownCapture}
    >
<Responsive
  key={editMode ? 'edit' : 'view'}
  className={`groupware-grid ${editMode ? 'edit-mode' : ''}`}
  layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
  cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
  rowHeight={50}
  width={width}
  margin={[16, 16]}
  containerPadding={[0, 0]}
  isDraggable={editMode}
  isResizable={editMode}
  draggableHandle=".drag-handle"
  compactType="vertical"
  onLayoutChange={(currentLayout) => {
    // 편집 모드일 때만 저장
    if (editMode) {
      updateLayout(currentLayout);
    }
  }}
  useCSSTransforms
>
        {layout.map((item) => {
          const meta = WIDGET_MAP[item.i];
          if (!meta) return null;
          const Component = meta.component;
          return (
            <div key={item.i}>
              <WidgetWrapper
                widgetId={item.i}
                title={meta.title}
                icon={meta.icon}
                iconColor={meta.iconColor}
              >
                <Component />
              </WidgetWrapper>
            </div>
          );
        })}
      </Responsive>
    </div>
  );
}