// components/dashboard/WidgetGrid.jsx
// 대시보드 상단 4개 위젯 — 잔여 연차 / 미확인 메일 / 결재 대기 / 오늘 일정.

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApprovalBadge } from '../../hooks/useApprovalBadge';
import { useMail } from '../../contexts/MailContext';
import { useLeaveBadge } from '../../hooks/useLeaveBadge';
import DashboardMeetings from './DashboardMeetings';
/* 오늘 날짜 YYYY-MM-DD — 로컬 타임존 기준 */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* 시:분 포맷 */
function fmtHM(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function WidgetGrid() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const approvalCount = useApprovalBadge();
  const { counts: mailCounts } = useMail();
  const unreadMail = mailCounts?.unread || 0;
  const { remaining, total } = useLeaveBadge({ withTotal: true });

  const [todayEvents, setTodayEvents] = useState([]);

  /* 오늘 일정 로드 */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const t = todayStr();
      const startISO = `${t}T00:00:00`;
      const endISO = `${t}T23:59:59`;
      const { data, error } = await supabase
        .from('schedule_events')
        .select('id, title, start_at, end_at, category, color')
        .eq('author_id', user.id)
        .gte('start_at', startISO)
        .lte('start_at', endISO)
        .order('start_at', { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error('[WidgetGrid] today events:', error);
        return;
      }
      setTodayEvents(data || []);
    })();
    return () => { cancelled = true; };
  }, [user]);

  /* 다음 일정 — 아직 지나가지 않은 가장 가까운 일정 */
  const nextEvent = useMemo(() => {
    return todayEvents.find((e) => new Date(e.start_at).getTime() >= Date.now()) || null;
  }, [todayEvents]);

  return (
    <section className="widget-grid">
      <div className="widget w-1" onClick={() => navigate('/leave')}>
        <h3>잔여 연차</h3>
        <div className="count">
          {remaining} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {total}</span>
        </div>
      </div>
      <div className="widget w-2" onClick={() => navigate('/mail')}>
        <h3>미확인 메일</h3>
        <div className="count" style={{ color: 'var(--primary-color)' }}>
          {unreadMail}
        </div>
      </div>
      <div className="widget w-3" onClick={() => navigate('/approval')}>
        <h3>결재 대기</h3>
        <div className="count" style={{ color: 'var(--danger)' }}>
          {approvalCount}
        </div>
      </div>
      <div className="widget w-4" onClick={() => navigate('/schedule')}>
        <h3>오늘 일정</h3>
        <div className="count" style={{ color: '#ff9f1c' }}>
          {todayEvents.length}
          <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginLeft: 4 }}>건</span>
        </div>
        {nextEvent ? (
          <p style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-muted)', 
            margin: '4px 0 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            다음: {fmtHM(nextEvent.start_at)} {nextEvent.title}
          </p>
        ) : todayEvents.length > 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            오늘 일정 완료
          </p>
        ) : (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            오늘은 일정 없음
          </p>
        )}
      </div>
    </section>
  );
}