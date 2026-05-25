// components/admin/AdminEventsTab.jsx
// 관리자 — 이달의 소식 일정 관리 탭.

import { useState, useMemo } from 'react';
import { useCompanyEvents } from '../../contexts/CompanyEventsContext';
import { useToast } from '../../contexts/ToastContext';
import {
  EVENT_CATEGORIES, getEventCategoryMeta,
} from '../../config/companyEventTypes';
import AdminEventEditModal from './AdminEventEditModal';

const FILTERS = [
  { id: 'upcoming', label: '예정 / 진행 중' },
  { id: 'this-month', label: '이번 달' },
  { id: 'past', label: '지난 일정' },
  { id: 'all', label: '전체' },
];

function fmtDate(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'short', day: 'numeric', weekday: 'short',
    });
  } catch { return iso; }
}

function fmtRange(start, end) {
  if (!start) return '-';
  if (!end || end === start) return fmtDate(start);
  return `${fmtDate(start)} ~ ${fmtDate(end)}`;
}

function dayDelta(iso) {
  if (!iso) return null;
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400_000);
}

export default function AdminEventsTab() {
  const toast = useToast();
  const { events, loading, error, deleteEvent } = useCompanyEvents();

  const [filter, setFilter] = useState('upcoming');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

    let list = events;

    // 기간 필터
    if (filter === 'upcoming') {
      list = list.filter((e) => {
        const end = e.end_date || e.event_date;
        return end >= todayStr;
      });
    } else if (filter === 'this-month') {
      list = list.filter((e) => e.event_date >= monthStart && e.event_date <= monthEnd);
    } else if (filter === 'past') {
      list = list.filter((e) => {
        const end = e.end_date || e.event_date;
        return end < todayStr;
      });
    }

    // 카테고리 필터
    if (catFilter !== 'all') {
      list = list.filter((e) => e.category === catFilter);
    }

    // 검색
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [events, filter, catFilter, search]);

  const handleDelete = async (event) => {
    if (!confirm(`"${event.title}" 일정을 삭제할까요?`)) return;
    const res = await deleteEvent(event.id);
    if (res.ok) toast.success('삭제됐어요');
    else toast.error(res.error);
  };

  const catCounts = useMemo(() => {
    const counts = { all: events.length };
    EVENT_CATEGORIES.forEach((c) => { counts[c.value] = 0; });
    events.forEach((e) => { counts[e.category] = (counts[e.category] || 0) + 1; });
    return counts;
  }, [events]);

  return (
    <div className="ce-admin">
      <div className="ce-admin-head">
        <div>
          <h3>
            <i className="fa-solid fa-calendar-days" style={{ color: '#ec4899', marginRight: 8 }} />
            이달의 소식 — 일정 관리
          </h3>
          <p className="ce-admin-desc">
            워크샵·휴일·회식 등을 등록하면 대시보드 "이달의 소식" 위젯에 자동으로 표시돼요.
            생일과 입사기념일은 직원 프로필에서 자동 연동되니 따로 등록할 필요 없어요.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-in"
          onClick={() => setCreateOpen(true)}
          style={{ padding: '10px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          <i className="fa-solid fa-plus" /> 새 일정
        </button>
      </div>

      {/* 필터 */}
      <div className="ce-admin-filters">
        <input
          type="text"
          className="form-input"
          placeholder="🔍 제목·설명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
        />
        <div className="ce-filter-group">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ce-chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ce-admin-filters">
        <span className="ce-filter-label">카테고리</span>
        <div className="ce-filter-group">
          <button
            type="button"
            className={`ce-chip ${catFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCatFilter('all')}
          >
            전체 ({catCounts.all})
          </button>
          {EVENT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`ce-chip ${catFilter === c.value ? 'active' : ''}`}
              onClick={() => setCatFilter(c.value)}
              style={catFilter === c.value ? {
                color: c.color, borderColor: c.color, background: `${c.color}10`,
              } : {}}
            >
              <i className={`fa-solid ${c.icon}`} /> {c.label} ({catCounts[c.value] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="ce-empty">
          <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
        </div>
      ) : error ? (
        <div className="ce-empty">
          <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--danger)' }} />
          <p>에러: {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ce-empty">
          <i className="fa-regular fa-calendar-plus" />
          <p>{search || catFilter !== 'all' || filter !== 'upcoming'
            ? '조건에 맞는 일정이 없어요'
            : '아직 등록된 일정이 없어요'}</p>
          <small>새 일정 버튼을 눌러 추가하세요</small>
        </div>
      ) : (
        <table className="ce-admin-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>제목</th>
              <th style={{ width: 220 }}>일정</th>
              <th style={{ width: 120 }}>카테고리</th>
              <th style={{ width: 140 }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const meta = getEventCategoryMeta(e.category);
              const delta = dayDelta(e.event_date);
              const endDelta = dayDelta(e.end_date || e.event_date);
              const isPast = endDelta < 0;
              const isToday = delta === 0;
              const isOngoing = delta <= 0 && endDelta >= 0;

              return (
                <tr
                  key={e.id}
                  className={isPast ? 'ce-row-past' : ''}
                  style={isOngoing && !isPast ? {
                    background: `${meta.color}08`,
                  } : {}}
                >
                  <td>
                    <div
                      className="ce-row-icon"
                      style={{ background: `${meta.color}20`, color: meta.color }}
                    >
                      <i className={`fa-solid ${meta.icon}`} />
                    </div>
                  </td>
                  <td>
                    <div className="ce-row-title">
                      {e.title}
                      {isToday && <span className="ce-today-badge">오늘</span>}
                      {isOngoing && !isToday && (
                        <span className="ce-ongoing-badge">진행 중</span>
                      )}
                    </div>
                    {e.description && (
                      <div className="ce-row-desc">
                        {e.description.length > 60
                          ? e.description.slice(0, 60) + '...'
                          : e.description}
                      </div>
                    )}
                  </td>
                  <td className="ce-row-date">
                    {fmtRange(e.event_date, e.end_date)}
                    {delta > 0 && delta <= 30 && !isPast && (
                      <span className="ce-row-dday">D-{delta}</span>
                    )}
                  </td>
                  <td>
                    <span
                      className="ce-cat-pill"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => setEditTarget(e)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => handleDelete(e)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <AdminEventEditModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <AdminEventEditModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        event={editTarget}
      />
    </div>
  );
}