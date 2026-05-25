// components/dashboard/Celebrations.jsx
// 이달의 소식 — 생일·입사기념일 (자동) + 회사 일정 (관리자 등록) 통합.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyEvents } from '../../contexts/CompanyEventsContext';
import { getEventCategoryMeta } from '../../config/companyEventTypes';

function md(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return { m: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear(), date: d };
  } catch { return null; }
}

function yearsLabel(hireYear, currentYear) {
  if (!hireYear || hireYear >= currentYear) return null;
  const years = currentYear - hireYear;
  return `${years}주년`;
}

function fmtMMDD(m, d) {
  return `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
}

function dayLabel(day, today) {
  if (day === today) return { text: '오늘', urgent: true };
  if (day === today + 1) return { text: '내일', urgent: true };
  if (day === today - 1) return { text: '어제', urgent: false };
  if (day > today) return { text: `D-${day - today}`, urgent: day - today <= 3 };
  return null;
}

/* 비교용 day-of-month 추출 (이번 달 내에서) */
function dayDistance(day, today) {
  return day < today ? 100 + day : day - today;
}

export default function Celebrations() {
  const { user } = useAuth();
  const { thisMonthEvents } = useCompanyEvents();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, department, birth_date, hire_date, avatar_url')
          .or('birth_date.not.is.null,hire_date.not.is.null');
        if (error) throw error;
        if (!cancelled) setPeople(data || []);
      } catch (e) {
        console.warn('[Celebrations]', e);
        if (!cancelled) setPeople([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  /* 모든 항목 통합 */
  const items = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const curDay = now.getDate();
    const out = [];

    /* 1) 생일 */
    for (const p of people) {
      const bd = md(p.birth_date);
      if (bd && bd.m === curMonth) {
        out.push({
          kind: 'birthday',
          id: `b-${p.id}`,
          name: p.full_name || '익명',
          dept: p.department,
          day: bd.day,
          dateStr: fmtMMDD(bd.m, bd.day),
        });
      }

      const hd = md(p.hire_date);
      if (hd && hd.m === curMonth) {
        const label = yearsLabel(hd.year, curYear);
        if (label) {
          out.push({
            kind: 'workiversary',
            id: `w-${p.id}`,
            name: p.full_name || '익명',
            dept: p.department,
            day: hd.day,
            dateStr: fmtMMDD(hd.m, hd.day),
            label,
          });
        }
      }
    }

    /* 2) 회사 일정 */
    for (const e of thisMonthEvents) {
      const ed = md(e.event_date);
      if (!ed) continue;
      const meta = getEventCategoryMeta(e.category);
      out.push({
        kind: 'event',
        id: `e-${e.id}`,
        name: e.title,
        dept: meta.label,
        day: ed.day,
        dateStr: fmtMMDD(ed.m, ed.day),
        category: e.category,
        color: e.color || meta.color,
        icon: e.icon || meta.icon,
        description: e.description,
        end_date: e.end_date,
      });
    }

    /* 정렬: 가까운 날 우선 */
    out.sort((a, b) => dayDistance(a.day, curDay) - dayDistance(b.day, curDay));
    return out;
  }, [people, thisMonthEvents]);

  const myMissingBirthDate = useMemo(() => {
    const me = people.find((p) => p.id === user?.id);
    return me && !me.birth_date;
  }, [people, user?.id]);

  return (
    <section className="panel">
      <div className="panel-header" style={{ marginBottom: 10 }}>
        <h2>
          <i
            className="fa-solid fa-cake-candles"
            style={{ color: 'var(--danger)', marginRight: 8 }}
          />
          이달의 소식
        </h2>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {new Date().getMonth() + 1}월
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i
            className="fa-regular fa-calendar"
            style={{ fontSize: '1.8rem', opacity: 0.4, marginBottom: 8, display: 'block' }}
          />
          <p style={{ margin: 0, fontSize: '0.88rem' }}>이번 달은 조용해요</p>
          {myMissingBirthDate && (
            <small style={{ fontSize: '0.78rem', display: 'block', marginTop: 4 }}>
              프로필에 생년월일을 등록해보세요 🎂
            </small>
          )}
        </div>
      ) : (
        <>
          <div>
            {items.slice(0, 8).map((c) => {
              const today = new Date().getDate();
              const label = dayLabel(c.day, today);
              return <CelebrationRow key={c.id} item={c} dayLabel={label} />;
            })}
          </div>

          {items.length > 8 && (
            <div style={{
              textAlign: 'center', marginTop: 8, fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}>
              그 외 {items.length - 8}건 더
            </div>
          )}

          {myMissingBirthDate && (
            <div className="celebrations-cta">
              <i className="fa-regular fa-lightbulb" />
              <small>프로필에서 생년월일을 등록하면 여기 표시돼요</small>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CelebrationRow({ item, dayLabel }) {
  let iconCls, icon, desc, iconStyle;

  if (item.kind === 'birthday') {
    iconCls = 'celeb-bday';
    icon = 'fa-gift';
    desc = `${item.dept || ''} 생일`.trim();
  } else if (item.kind === 'workiversary') {
    iconCls = 'celeb-work';
    icon = 'fa-award';
    desc = `${item.dept || ''} 입사 ${item.label}`.trim();
  } else {
    /* event */
    iconCls = '';
    icon = item.icon || 'fa-circle-info';
    iconStyle = {
      background: `${item.color}20`,
      color: item.color,
    };
    desc = item.description
      ? (item.description.length > 30
          ? item.description.slice(0, 30) + '...'
          : item.description)
      : item.dept;
  }

  return (
    <div className={`celebration-item ${dayLabel?.urgent ? 'urgent' : ''}`}>
      <div className={`celebration-icon ${iconCls}`} style={iconStyle}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="celebration-info">
        <h4>
          {item.name}
          {dayLabel?.urgent && (
            <span className="celebration-today-badge" style={{ marginLeft: 6 }}>
              {dayLabel.text}
            </span>
          )}
        </h4>
        <p>{desc}</p>
      </div>
      <span className="celebration-date">
        {dayLabel && !dayLabel.urgent ? dayLabel.text : item.dateStr}
      </span>
    </div>
  );
}