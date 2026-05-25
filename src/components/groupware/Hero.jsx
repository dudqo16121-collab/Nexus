// components/groupware/Hero.jsx
// 개인화된 오늘의 요약 Hero.
//
// 구성:
//  - 시간대별 인사말 + 이름
//  - 오늘 날짜 / 요일
//  - 출근 상태 미니 위젯 (라이브 근무시간 카운터)
//  - 결재 대기 / 오늘 일정 / 미확인 메일 요약 카드
//  - 출근/퇴근 빠른 액션

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useApprovalBadge } from '../../hooks/useApprovalBadge';
import { useMail } from '../../contexts/MailContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

/* 오늘 날짜 (YYYY-MM-DD, 한국 기준) */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* 시간대별 인사말 */
function greetingByHour(h) {
  if (h < 6)  return { text: '늦은 시간이네요',   icon: '🌙' };
  if (h < 12) return { text: '좋은 아침이에요',   icon: '☀️' };
  if (h < 14) return { text: '점심은 드셨나요',   icon: '🍽️' };
  if (h < 18) return { text: '오후도 화이팅이에요', icon: '⚡' };
  if (h < 22) return { text: '오늘도 수고 많으셨어요', icon: '🌆' };
  return { text: '편안한 저녁이에요', icon: '🌙' };
}

/* 근무 시간 계산 (밀리초 → "8h 23m") */
function fmtWorked(ms) {
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

/* 시:분 */
function fmtHM(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function Hero() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();
  const approvalCount = useApprovalBadge();
  const { counts: mailCounts } = useMail();

  /* 현재 시각 — 1분마다 갱신 (인사말 + 라이브 근무시간) */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  /* 오늘 출근 기록 */
  const [attendance, setAttendance] = useState(null);
  const [todayEvents, setTodayEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  /* 데이터 로드 — 본인 출근 기록 + 오늘 일정 */
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      /* 1) 오늘 본인 출근 기록 */
      const { data: attRows } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('created_at', todayStr())
        .limit(1);
      setAttendance(attRows?.[0] || null);

      /* 2) 오늘 일정 (본인이 등록한 일정 — 오늘 범위 내) */
      const t = todayStr();
      const startISO = `${t}T00:00:00`;
      const endISO = `${t}T23:59:59`;
      const { data: events } = await supabase
        .from('schedule_events')
        .select('id, title, start_at, end_at, category, color')
        .eq('author_id', user.id)
        .gte('start_at', startISO)
        .lte('start_at', endISO)
        .order('start_at', { ascending: true });
      setTodayEvents(events || []);
    } catch (e) {
      console.error('[Hero] loadData:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* 인사말 */
  const greeting = useMemo(() => greetingByHour(now.getHours()), [now]);

  /* 날짜 표시 */
  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }),
    [now]
  );

  /* 근무 상태 */
  const workStatus = useMemo(() => {
    if (!attendance) return { kind: 'not_in', label: '출근 전입니다' };
    if (attendance.check_out) {
      const worked = new Date(attendance.check_out) - new Date(attendance.check_in);
      return {
        kind: 'done',
        label: '퇴근 완료',
        checkIn: attendance.check_in,
        checkOut: attendance.check_out,
        worked,
      };
    }
    if (attendance.check_in) {
      const worked = now - new Date(attendance.check_in);
      return {
        kind: 'working',
        label: '근무 중',
        checkIn: attendance.check_in,
        worked,
      };
    }
    return { kind: 'not_in', label: '출근 전입니다' };
  }, [attendance, now]);

  /* 다음 일정 */
  const nextEvent = useMemo(() => {
    return todayEvents.find((e) => new Date(e.start_at).getTime() >= Date.now()) || null;
  }, [todayEvents]);

  /* 출근 처리 */
  const handleCheckIn = async () => {
    if (!user) return;
    try {
      const payload = {
        user_id: user.id,
        check_in: new Date().toISOString(),
        created_at: todayStr(),
        status: '정상',
      };
      const { data, error } = await supabase
        .from('attendance')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      setAttendance(data);
      toast.success('출근 완료. 오늘도 화이팅!');
    } catch (e) {
      toast.error(`출근 실패: ${e.message}`);
    }
  };

  /* 퇴근 처리 */
  const handleCheckOut = async () => {
    if (!attendance) return;
    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('attendance_no', attendance.attendance_no)
        .select()
        .single();
      if (error) throw error;
      setAttendance(data);
      toast.success('퇴근 처리. 수고 많으셨어요!');
    } catch (e) {
      toast.error(`퇴근 실패: ${e.message}`);
    }
  };

  const userName = profile?.full_name || '사용자';
  const unreadMail = mailCounts?.unread || 0;

  return (
    <section className="hero-personal">
      {/* 좌측: 인사말 + 출근 상태 */}
      <div className="hero-left">
        <div className="hero-date">{dateLabel}</div>

        <h1 className="hero-greeting">
          <span className="hero-greeting-icon">{greeting.icon}</span>
          {userName}님,
          <br />
          {greeting.text}.
        </h1>

        <div className="hero-attendance">
          {workStatus.kind === 'not_in' ? (
            <>
              <div className="hero-attendance-info">
                <span className="hero-attendance-label">
                  <span className="hero-status-dot hero-status-dot-off" />
                  {workStatus.label}
                </span>
                <span className="hero-attendance-sub">
                  하루를 시작해볼까요?
                </span>
              </div>
              <button
                type="button"
                className="hero-checkin-btn"
                onClick={handleCheckIn}
              >
                <i className="fa-solid fa-arrow-right-to-bracket" /> 출근하기
              </button>
            </>
          ) : workStatus.kind === 'working' ? (
            <>
              <div className="hero-attendance-info">
                <span className="hero-attendance-label">
                  <span className="hero-status-dot hero-status-dot-on" />
                  {workStatus.label}
                </span>
                <span className="hero-attendance-sub">
                  {fmtHM(workStatus.checkIn)} 출근 · {fmtWorked(workStatus.worked)} 근무
                </span>
              </div>
              <button
                type="button"
                className="hero-checkout-btn"
                onClick={handleCheckOut}
              >
                <i className="fa-solid fa-arrow-right-from-bracket" /> 퇴근하기
              </button>
            </>
          ) : (
            <>
              <div className="hero-attendance-info">
                <span className="hero-attendance-label">
                  <span className="hero-status-dot hero-status-dot-done" />
                  {workStatus.label}
                </span>
                <span className="hero-attendance-sub">
                  {fmtHM(workStatus.checkIn)} ~ {fmtHM(workStatus.checkOut)} · {fmtWorked(workStatus.worked)}
                </span>
              </div>
              <button
                type="button"
                className="hero-checkout-btn"
                disabled
              >
                <i className="fa-solid fa-check" /> 퇴근 완료
              </button>
            </>
          )}
        </div>
      </div>

      {/* 우측: 요약 카드 3개 */}
      <div className="hero-right">
        <button
          type="button"
          className="hero-card hero-card-approval"
          onClick={() => navigate('/approval')}
        >
          <div className="hero-card-icon">
            <i className="fa-solid fa-stamp" />
          </div>
          <div className="hero-card-body">
            <div className="hero-card-value">{approvalCount}</div>
            <div className="hero-card-label">결재 대기</div>
          </div>
          <i className="fa-solid fa-chevron-right hero-card-arrow" />
        </button>

        <button
          type="button"
          className="hero-card hero-card-schedule"
          onClick={() => navigate('/schedule')}
        >
          <div className="hero-card-icon">
            <i className="fa-solid fa-calendar-day" />
          </div>
          <div className="hero-card-body">
            <div className="hero-card-value">{todayEvents.length}</div>
            <div className="hero-card-label">
              {nextEvent
                ? `${fmtHM(nextEvent.start_at)} ${nextEvent.title}`
                : '오늘 일정'}
            </div>
          </div>
          <i className="fa-solid fa-chevron-right hero-card-arrow" />
        </button>

        <button
          type="button"
          className="hero-card hero-card-mail"
          onClick={() => navigate('/mail')}
        >
          <div className="hero-card-icon">
            <i className="fa-solid fa-envelope" />
          </div>
          <div className="hero-card-body">
            <div className="hero-card-value">{unreadMail}</div>
            <div className="hero-card-label">미확인 메일</div>
          </div>
          <i className="fa-solid fa-chevron-right hero-card-arrow" />
        </button>
      </div>
    </section>
  );
}