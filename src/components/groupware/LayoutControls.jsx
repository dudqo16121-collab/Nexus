// components/groupware/LayoutControls.jsx
// 그룹웨어 페이지 헤더의 편집/리셋 컨트롤.

import { useGroupwareLayout } from '../../contexts/GroupwareLayoutContext';

export default function LayoutControls() {
  const { editMode, toggleEditMode, resetLayout } = useGroupwareLayout();

  const handleReset = () => {
    if (window.confirm('레이아웃을 기본값으로 되돌릴까요?\n접힌 상태도 모두 펴져요.')) {
      resetLayout();
    }
  };

  return (
    <div className="layout-controls">
      {editMode && (
        <button
          type="button"
          className="layout-control-btn ghost"
          onClick={handleReset}
        >
          <i className="fa-solid fa-rotate-left" />
          기본값 복원
        </button>
      )}
      <button
        type="button"
        className={`layout-control-btn ${editMode ? 'active' : ''}`}
        onClick={toggleEditMode}
      >
        <i className={`fa-solid ${editMode ? 'fa-check' : 'fa-pen-ruler'}`} />
        {editMode ? '편집 완료' : '레이아웃 편집'}
      </button>
    </div>
  );
}