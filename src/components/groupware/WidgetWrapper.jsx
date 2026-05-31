// components/groupware/WidgetWrapper.jsx
import { useGroupwareLayout } from '../../contexts/GroupwareLayoutContext';

export default function WidgetWrapper({ widgetId, title, icon, iconColor, children }) {
  const { editMode, isCollapsed, toggleCollapse } = useGroupwareLayout();
  const collapsed = isCollapsed(widgetId);

  /* 편집 모드 아닐 때 드래그 시작 자체를 막음 */
  const handleHeaderMouseDown = (e) => {
    if (!editMode) {
      e.stopPropagation();
    }
  };

  return (
    <div className={`widget-wrapper ${collapsed ? 'collapsed' : ''} ${editMode ? 'edit-mode' : ''}`}>
      <div
        className={`widget-header ${editMode ? 'drag-handle' : ''}`}
        onMouseDown={handleHeaderMouseDown}
        onTouchStart={handleHeaderMouseDown}
      >
        <div className="widget-header-title">
          {editMode && <i className="fa-solid fa-grip-vertical widget-drag-icon" />}
          {icon && <i className={`fa-solid ${icon}`} style={{ color: iconColor }} />}
          <span>{title}</span>
        </div>
        <div className="widget-header-actions">
          <button
            type="button"
            className="widget-collapse-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(widgetId);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title={collapsed ? '펼치기' : '접기'}
          >
            <i className={`fa-solid ${collapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="widget-body">
          {children}
        </div>
      )}
    </div>
  );
}