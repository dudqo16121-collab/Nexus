// 일정 페이지 상단 헤더 — 기간 표시 / 이동 / 뷰 전환 / 새 일정.

import { useSchedule } from '../../contexts/ScheduleContext';

export default function ScheduleHeader() {
  const {
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    openCreateModal,
  } = useSchedule();

  /* 기간 라벨 */
  const periodLabel = (() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    if (viewMode === 'month') {
      return `${y}년 ${m + 1}월`;
    }
    if (viewMode === 'week') {
      const day = currentDate.getDay();
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const sm = start.getMonth() + 1, sd = start.getDate();
      const em = end.getMonth() + 1, ed = end.getDate();
      return `${y}년 ${sm}월 ${sd}일 - ${em}월 ${ed}일`;
    }
    /* day */
    return `${y}년 ${m + 1}월 ${currentDate.getDate()}일 (${
      ['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]
    })`;
  })();

  const goPrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month')      next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week')  next.setDate(next.getDate() - 7);
    else                            next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };
  const goNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month')      next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week')  next.setDate(next.getDate() + 7);
    else                            next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };
  const goToday = () => setCurrentDate(new Date());

  return (
    <header className="schedule-header">
      <div className="schedule-header-left">
        <h2>
          <i className="fa-solid fa-calendar-days" style={{ color: 'var(--primary-color)', marginRight: 10 }} />
          일정 관리
        </h2>

        <div className="schedule-nav">
          <button onClick={goPrev} title="이전" type="button">
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button onClick={goToday} className="schedule-today-btn" type="button">
            오늘
          </button>
          <button onClick={goNext} title="다음" type="button">
            <i className="fa-solid fa-chevron-right" />
          </button>
          <span className="schedule-period">{periodLabel}</span>
        </div>
      </div>

      <div className="schedule-header-right">
        <div className="schedule-view-switch">
          {['month', 'week', 'day'].map((mode) => (
            <button
              key={mode}
              type="button"
              className={`schedule-view-btn ${viewMode === mode ? 'active' : ''}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'month' ? '월' : mode === 'week' ? '주' : '일'}
            </button>
          ))}
        </div>

        <button className="btn btn-in" onClick={() => openCreateModal()} type="button" style={{ width: 'auto', padding: '8px 16px' }}>
          <i className="fa-solid fa-plus" /> 새 일정
        </button>
      </div>
    </header>
  );
}