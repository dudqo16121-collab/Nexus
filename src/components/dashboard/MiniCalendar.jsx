// components/dashboard/MiniCalendar.jsx
// 미니 캘린더 — schedule_events 와 연동.
// 일정 있는 날에 점 표시 + 날짜 클릭 시 그날 일정 미리보기.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/* YYYY-MM-DD (로컬) */
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* 시:분 */
function fmtHM(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MiniCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null); // 클릭한 날
  const [events, setEvents] = useState([]); // 현재 월의 이벤트
  const today = new Date();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /* 현재 보는 월의 일정 로드 */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const start = new Date(year, month, 1, 0, 0, 0).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const { data, error } = await supabase
        .from('schedule_events')
        .select('id, title, start_at, end_at, color, category')
        .eq('author_id', user.id)
        .gte('start_at', start)
        .lte('start_at', end)
        .order('start_at', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error('[MiniCalendar] events load:', error);
        return;
      }
      setEvents(data || []);
    })();
    return () => { cancelled = true; };
  }, [user, year, month]);

  /* 날짜별로 일정 그룹핑 */
  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const key = dateKey(new Date(ev.start_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    });
    return map;
  }, [events]);

  /* 선택된 날짜의 일정 */
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate.get(selectedDate) || [];
  }, [selectedDate, eventsByDate]);

  /* 빈칸 + 날짜 배열 */
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const isSelected = (d) => {
    if (!selectedDate) return false;
    return dateKey(new Date(year, month, d)) === selectedDate;
  };

  const goPrev = () => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };
  const goNext = () => {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };
  const goToday = () => {
    setViewDate(new Date());
    setSelectedDate(dateKey(new Date()));
  };

  const handleDayClick = (d) => {
    const key = dateKey(new Date(year, month, d));
    setSelectedDate(key === selectedDate ? null : key);
  };

  const monthEventCount = events.length;

  return (
    <div className="calendar-widget panel">
      {/* 헤더 */}
      <div className="calendar-header" style={{ alignItems: 'center' }}>
        <button onClick={goPrev}><i className="fa-solid fa-chevron-left"></i></button>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
            {year}년 {month + 1}월
          </h3>
          {monthEventCount > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              일정 {monthEventCount}개
            </span>
          )}
        </div>
        <button onClick={goNext}><i className="fa-solid fa-chevron-right"></i></button>
      </div>

      {/* 빠른 액션 */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 10,
          fontSize: '0.74rem',
        }}
      >
        <button
          type="button"
          onClick={goToday}
          style={{
            flex: 1,
            background: 'var(--bg-2)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            padding: '5px 8px',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
          }}
        >
          오늘
        </button>
        <button
          type="button"
          onClick={() => navigate('/schedule')}
          style={{
            flex: 1,
            background: 'var(--primary-color)',
            color: '#fff',
            border: 'none',
            padding: '5px 8px',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
          }}
        >
          일정 보기 →
        </button>
      </div>

      {/* 캘린더 그리드 */}
      <div className="calendar-grid">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`day-name ${i === 0 ? 'sun' : ''} ${i === 6 ? 'sat' : ''}`}
          >
            {name}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} className="day empty"></div>;
          const dayOfWeek = (firstDay + d - 1) % 7;
          const isSun = dayOfWeek === 0;
          const isSat = dayOfWeek === 6;
          const key = dateKey(new Date(year, month, d));
          const dayEvents = eventsByDate.get(key) || [];
          const hasEvents = dayEvents.length > 0;
          const selected = isSelected(d);

          return (
            <div
              key={d}
              className={`day ${isToday(d) ? 'today' : ''} ${isSun ? 'sun' : ''} ${isSat ? 'sat' : ''} ${selected ? 'selected' : ''} ${hasEvents ? 'has-events' : ''}`}
              onClick={() => handleDayClick(d)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              {d}
              {hasEvents && (
                <span className="day-dots">
                  {dayEvents.slice(0, 3).map((ev, idx) => (
                    <span
                      key={idx}
                      className="day-dot"
                      style={{ background: ev.color || '#f72585' }}
                    />
                  ))}
                  {dayEvents.length > 3 && <span className="day-dot-more">+</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 선택된 날의 일정 리스트 */}
      {selectedDate && (
        <div className="mini-cal-day-events">
          <div className="mini-cal-day-events-header">
            <i className="fa-solid fa-calendar-day" />
            {selectedDate.split('-').slice(1).join('월 ')}일 일정
            <span className="mini-cal-day-events-count">{selectedDayEvents.length}개</span>
          </div>
          {selectedDayEvents.length === 0 ? (
            <div className="mini-cal-day-events-empty">
              일정이 없어요
            </div>
          ) : (
            <div className="mini-cal-day-events-list">
              {selectedDayEvents.slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  className="mini-cal-event-item"
                  onClick={() => navigate('/schedule')}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className="mini-cal-event-dot"
                    style={{ background: ev.color || '#f72585' }}
                  />
                  <span className="mini-cal-event-time">{fmtHM(ev.start_at)}</span>
                  <span className="mini-cal-event-title">{ev.title}</span>
                </div>
              ))}
              {selectedDayEvents.length > 4 && (
                <div
                  className="mini-cal-event-more"
                  onClick={() => navigate('/schedule')}
                >
                  + {selectedDayEvents.length - 4}개 더 보기
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}