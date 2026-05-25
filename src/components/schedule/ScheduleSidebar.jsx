// 일정 페이지 좌측 사이드바 — 미니 캘린더 + 카테고리 필터.

import { useSchedule, CATEGORIES } from '../../contexts/ScheduleContext';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export default function ScheduleSidebar() {
  const { currentDate, setCurrentDate, activeCategories, toggleCategory } = useSchedule();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d) => d === currentDate.getDate();

  const handleDayClick = (d) => {
    if (!d) return;
    setCurrentDate(new Date(year, month, d));
  };

  return (
    <aside className="schedule-sidebar">
      {/* 미니 캘린더 */}
      <div className="schedule-mini-cal">
        <div className="schedule-mini-cal-header">
          <strong>{year}년 {month + 1}월</strong>
        </div>
        <div className="schedule-mini-cal-grid">
          {DAY_NAMES.map((n, i) => (
            <div
              key={`h-${i}`}
              className="schedule-mini-cal-dayname"
              style={{
                color: i === 0 ? 'var(--danger)' : i === 6 ? 'var(--primary-color)' : 'var(--text-muted)',
              }}
            >
              {n}
            </div>
          ))}
          {cells.map((d, i) => (
            <button
              key={`c-${i}`}
              type="button"
              disabled={!d}
              onClick={() => handleDayClick(d)}
              className={`schedule-mini-cal-cell ${isToday(d) ? 'today' : ''} ${isSelected(d) ? 'selected' : ''}`}
            >
              {d || ''}
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="schedule-filter">
        <h4>카테고리</h4>
        <div className="schedule-filter-list">
          {CATEGORIES.map((c) => {
            const active = activeCategories.has(c.id);
            return (
              <label key={c.id} className={`schedule-filter-item ${active ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleCategory(c.id)}
                />
                <span className="schedule-filter-dot" style={{ background: c.color }} />
                <span>{c.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}