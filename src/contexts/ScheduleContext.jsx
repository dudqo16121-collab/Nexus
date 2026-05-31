// contexts/ScheduleContext.jsx
// 일정 페이지 데이터 로직 — 스마트 일정 관리 + 초대 + 반복 + 알림.

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { useToast } from './ToastContext';

const ScheduleContext = createContext(null);

export const CATEGORIES = [
  { id: 'meeting',  label: '회의',  color: '#4361ee' },
  { id: 'personal', label: '개인',  color: '#06d6a0' },
  { id: 'leave',    label: '휴가',  color: '#f72585' },
  { id: 'business', label: '출장',  color: '#ff9f1c' },
  { id: 'etc',      label: '기타',  color: '#8338ec' },
];

export const RECURRENCE_FREQS = [
  { id: 'none',    label: '반복 안 함' },
  { id: 'daily',   label: '매일' },
  { id: 'weekly',  label: '매주' },
  { id: 'monthly', label: '매월' },
  { id: 'weekday', label: '주중 매일 (월~금)' },
];

export const INVITATION_STATUS = {
  pending:    { label: '응답 대기', color: '#94a3b8', icon: 'fa-clock' },
  accepted:   { label: '수락',     color: '#06d6a0', icon: 'fa-check-circle' },
  declined:   { label: '거절',     color: '#ef4444', icon: 'fa-times-circle' },
  tentative:  { label: '미정',     color: '#f59e0b', icon: 'fa-question-circle' },
};

export function ScheduleProvider({ children }) {
  const { user } = useAuth();
  const { createNotification, createBulkNotifications } = useNotification();
  const toast = useToast();

  /* unmount 가드 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const [events, setEvents] = useState([]);
  const [invitations, setInvitations] = useState([]); // 모든 초대 (내가 받은 + 내가 보낸)
  const [loading, setLoading] = useState(false);

  /* 뷰 상태 */
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  /* 카테고리 필터 */
  const [activeCategories, setActiveCategories] = useState(
    new Set(CATEGORIES.map((c) => c.id))
  );

  /* 검색 */
  const [searchKeyword, setSearchKeyword] = useState('');

  /* 모달 상태 */
  const [eventModal, setEventModal] = useState({
    open: false,
    event: null,
    defaultDate: null,
  });

  /* 알림 전송 기록 — sessionStorage로 새로고침 시 리셋 */
  const reminderSentRef = useRef(new Set());

  /* ─── 이벤트 fetch ─── */
  const fetchEvents = useCallback(async () => {
    if (mountedRef.current) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_events')
        .select('*')
        .order('start_at', { ascending: true });
      if (error) throw error;
      if (mountedRef.current) setEvents(data || []);
    } catch (e) {
      console.error('[Schedule] fetchEvents:', e);
      if (mountedRef.current) setEvents([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  /* ─── 초대 fetch ─── */
  const fetchInvitations = useCallback(async () => {
    if (!user) {
      if (mountedRef.current) setInvitations([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('schedule_invitations')
        .select('*')
        .or(`invitee_id.eq.${user.id},inviter_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (mountedRef.current) setInvitations(data || []);
    } catch (e) {
      console.error('[Schedule] fetchInvitations:', e);
      if (mountedRef.current) setInvitations([]);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
    fetchInvitations();
  }, [fetchEvents, fetchInvitations]);

  /* ─── 반복 일정 생성 (인스턴스 펼치기) ─── */
  const expandRecurringEvents = useCallback((eventList, fromDate, toDate) => {
    const expanded = [];
    const from = new Date(fromDate);
    const to = new Date(toDate);

    for (const ev of eventList) {
      if (!ev.recurrence_rule || ev.recurrence_rule.freq === 'none') {
        expanded.push(ev);
        continue;
      }

      const rule = ev.recurrence_rule;
      const startBase = new Date(ev.start_at);
      const endBase = new Date(ev.end_at || ev.start_at);
      const duration = endBase.getTime() - startBase.getTime();
      const until = rule.until ? new Date(rule.until) : to;

      let current = new Date(startBase);
      let count = 0;
      const maxCount = 365; // 안전 가드

      while (current <= until && current <= to && count < maxCount) {
        if (current >= from) {
          const isWeekday = current.getDay() >= 1 && current.getDay() <= 5;
          const shouldInclude =
            rule.freq === 'daily' ||
            rule.freq === 'weekly' ||
            rule.freq === 'monthly' ||
            (rule.freq === 'weekday' && isWeekday);

          if (shouldInclude) {
            expanded.push({
              ...ev,
              id: `${ev.id}__${current.toISOString()}`, // 가상 ID
              original_id: ev.id,
              is_recurring_instance: true,
              start_at: current.toISOString(),
              end_at: new Date(current.getTime() + duration).toISOString(),
            });
          }
        }

        /* 다음 반복 시점 */
        const interval = rule.interval || 1;
        if (rule.freq === 'daily' || rule.freq === 'weekday') {
          current.setDate(current.getDate() + 1);
        } else if (rule.freq === 'weekly') {
          current.setDate(current.getDate() + 7 * interval);
        } else if (rule.freq === 'monthly') {
          current.setMonth(current.getMonth() + interval);
        } else {
          break;
        }
        count++;
      }
    }
    return expanded;
  }, []);

  /* ─── 이벤트 생성 (반복 + 초대 포함) ─── */
  const createEvent = useCallback(
    async (payload) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { invitees = [], recurrence = null, ...rest } = payload;

        const row = {
          title: (rest.title || '').trim() || '새 일정',
          description: rest.description || '',
          start_at: rest.start_at,
          end_at: rest.end_at,
          all_day: !!rest.all_day,
          category: rest.category || 'meeting',
          color: rest.color || '#4361ee',
          author_id: user.id,
          recurrence_rule: recurrence && recurrence.freq !== 'none' ? recurrence : null,
          is_recurring: !!(recurrence && recurrence.freq !== 'none'),
        };

        const { data: event, error } = await supabase
          .from('schedule_events')
          .insert([row])
          .select()
          .single();

        if (error) throw error;

        if (mountedRef.current) {
          setEvents((prev) => [...prev, event].sort(
            (a, b) => new Date(a.start_at) - new Date(b.start_at)
          ));
        }

        /* 초대장 발송 */
        if (invitees.length > 0) {
          const invRows = invitees
            .filter((id) => id !== user.id)
            .map((inviteeId) => ({
              event_id: event.id,
              invitee_id: inviteeId,
              inviter_id: user.id,
            }));

          if (invRows.length > 0) {
            const { data: invData, error: invErr } = await supabase
              .from('schedule_invitations')
              .insert(invRows)
              .select();

            if (invErr) {
              console.warn('[Schedule] invitations insert:', invErr);
            } else if (invData) {
              if (mountedRef.current) {
                setInvitations((prev) => [...invData, ...prev]);
              }

              /* 알림 발송 */
              createBulkNotifications(
                invRows.map((r) => r.invitee_id),
                {
                  type: 'system',
                  title: '일정에 초대받았어요 📅',
                  body: `${event.title} — ${new Date(event.start_at).toLocaleString('ko-KR')}`,
                  link: '/schedule',
                  refId: event.id,
                }
              );
            }
          }
        }

        return { ok: true, event };
      } catch (e) {
        console.error('[Schedule] createEvent:', e);
        return { ok: false, error: e.message || '생성 실패' };
      }
    },
    [user, createBulkNotifications]
  );

/* ─── 일정 이동 — 날짜만/시간까지 변경 ─── */
  const moveEvent = useCallback(async (id, { newStartAt, newEndAt }) => {
    /* 반복 인스턴스인 경우 원본 ID로 변환 */
    const realId = String(id).includes('__') ? id.split('__')[0] : id;

    try {
      const { data, error } = await supabase
        .from('schedule_events')
        .update({
          start_at: newStartAt,
          end_at: newEndAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', realId)
        .select()
        .single();
      if (error) throw error;

      if (mountedRef.current) {
        setEvents((prev) =>
          prev.map((e) => (e.id === realId ? data : e)).sort(
            (a, b) => new Date(a.start_at) - new Date(b.start_at)
          )
        );
      }

      /* 연결된 회의실 예약도 같이 이동 (시간이 바뀐 경우) */
      if (data.room_booking_id) {
        const newStartDate = new Date(newStartAt);
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${newStartDate.getFullYear()}-${pad(newStartDate.getMonth() + 1)}-${pad(newStartDate.getDate())}`;
        const timeSlot = `${pad(newStartDate.getHours())}:00`;

        try {
          await supabase
            .from('room_bookings')
            .update({ date: dateStr, time_slot: timeSlot })
            .eq('id', data.room_booking_id);
        } catch (e) {
          console.warn('[Schedule] room booking sync failed:', e);
        }
      }

      return { ok: true, event: data };
    } catch (e) {
      console.error('[Schedule] moveEvent:', e);
      return { ok: false, error: e.message || '이동 실패' };
    }
  }, []);
 /* ─── 이벤트 수정 ─── */
  const updateEvent = useCallback(async (id, updates) => {
    try {
      const { invitees, recurrence, ...rest } = updates;

      /* recurrence는 별도 컬럼명 매핑 */
      const dbUpdates = {
        ...rest,
        updated_at: new Date().toISOString(),
      };

      /* recurrence가 명시적으로 전달된 경우만 처리 */
      if (recurrence !== undefined) {
        dbUpdates.recurrence_rule = recurrence && recurrence.freq !== 'none' ? recurrence : null;
        dbUpdates.is_recurring = !!(recurrence && recurrence.freq !== 'none');
      }

      const { data, error } = await supabase
        .from('schedule_events')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      if (mountedRef.current) {
        setEvents((prev) =>
          prev.map((e) => (e.id === id ? data : e)).sort(
            (a, b) => new Date(a.start_at) - new Date(b.start_at)
          )
        );
      }

      /* 초대자 변경 처리 — 기존과 비교해서 추가/제거 */
      if (Array.isArray(invitees)) {
        /* 본인 제외, 중복 제거 */
        const newIds = new Set(invitees.filter((uid) => uid && uid !== user?.id));

        /* 현재 DB에서 직접 조회 — invitations state가 stale일 수 있어서 */
        const { data: existingInvs } = await supabase
          .from('schedule_invitations')
          .select('id, invitee_id')
          .eq('event_id', id);

        const existingIds = new Set((existingInvs || []).map((inv) => inv.invitee_id));

        /* 추가할 사람 — 기존에 없는 사람만 */
        const toAdd = [...newIds].filter((uid) => !existingIds.has(uid));
        if (toAdd.length > 0) {
          const rows = toAdd.map((inviteeId) => ({
            event_id: id,
            invitee_id: inviteeId,
            inviter_id: user.id,
          }));
          const { data: newInvs, error: insErr } = await supabase
            .from('schedule_invitations')
            .insert(rows)
            .select();
          
          if (insErr) {
            console.warn('[Schedule] invitations insert:', insErr);
          } else if (newInvs && mountedRef.current) {
            setInvitations((prev) => [...newInvs, ...prev]);
            createBulkNotifications(toAdd, {
              type: 'system',
              title: '일정에 초대받았어요 📅',
              body: `${data.title} — ${new Date(data.start_at).toLocaleString('ko-KR')}`,
              link: '/schedule',
              refId: id,
            });
          }
        }

        /* 제거할 사람 — 기존엔 있는데 새 목록에 없는 사람 */
        const toRemove = [...existingIds].filter((uid) => !newIds.has(uid));
        if (toRemove.length > 0) {
          const { error: delErr } = await supabase
            .from('schedule_invitations')
            .delete()
            .eq('event_id', id)
            .in('invitee_id', toRemove);
          
          if (!delErr && mountedRef.current) {
            setInvitations((prev) =>
              prev.filter((inv) =>
                !(inv.event_id === id && toRemove.includes(inv.invitee_id))
              )
            );
          }
        }
      }

      return { ok: true, event: data };
    } catch (e) {
      console.error('[Schedule] updateEvent:', e);
      return { ok: false, error: e.message || '수정 실패' };
    }
  }, [user, createBulkNotifications]);

  /* ─── 이벤트 삭제 ─── */
  const deleteEvent = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('schedule_events').delete().eq('id', id);
      if (error) throw error;

      if (mountedRef.current) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setInvitations((prev) => prev.filter((inv) => inv.event_id !== id));
      }
      return { ok: true };
    } catch (e) {
      console.error('[Schedule] deleteEvent:', e);
      return { ok: false, error: e.message || '삭제 실패' };
    }
  }, []);

  /* ─── 초대 응답 ─── */
  const respondToInvitation = useCallback(async (invitationId, status, note = '') => {
    try {
      const { data, error } = await supabase
        .from('schedule_invitations')
        .update({
          status,
          response_note: note,
          responded_at: new Date().toISOString(),
        })
        .eq('id', invitationId)
        .select()
        .single();
      if (error) throw error;

      if (mountedRef.current) {
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === invitationId ? data : inv))
        );
      }

      /* 일정 작성자에게 알림 */
      const event = events.find((e) => e.id === data.event_id);
      if (event && event.author_id !== user?.id) {
        const statusLabel = INVITATION_STATUS[status]?.label || status;
        createNotification({
          toUserId: event.author_id,
          type: 'system',
          title: '일정 초대 응답 도착',
          body: `${event.title} — ${statusLabel}`,
          link: '/schedule',
          refId: event.id,
        });
      }

      return { ok: true };
    } catch (e) {
      console.error('[Schedule] respondToInvitation:', e);
      return { ok: false, error: e.message };
    }
  }, [events, user, createNotification]);

  /* ─── 카테고리 토글 ─── */
  const toggleCategory = useCallback((catId) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  /* ─── 필터링 + 반복 펼치기 ─── */
  const filteredEvents = useMemo(() => {
    /* 현재 보고 있는 기간 +/- 3개월 정도 펼침 */
    const from = new Date(currentDate);
    from.setMonth(from.getMonth() - 1);
    const to = new Date(currentDate);
    to.setMonth(to.getMonth() + 3);

    let result = expandRecurringEvents(events, from, to);

    /* 카테고리 필터 */
    result = result.filter((e) => activeCategories.has(e.category || 'etc'));

    /* 검색 */
    if (searchKeyword.trim()) {
      const q = searchKeyword.trim().toLowerCase();
      result = result.filter(
        (e) =>
          (e.title || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [events, currentDate, activeCategories, searchKeyword, expandRecurringEvents]);

  /* ─── 내가 받은 초대 (pending만) ─── */
  const myPendingInvitations = useMemo(() => {
    if (!user) return [];
    return invitations.filter(
      (inv) => inv.invitee_id === user.id && inv.status === 'pending'
    );
  }, [invitations, user]);

  /* ─── 이벤트별 초대자 목록 ─── */
  const invitationsByEvent = useCallback(
    (eventId) => {
      /* 반복 일정 인스턴스라면 original_id로 찾기 */
      const realId = eventId.includes('__') ? eventId.split('__')[0] : eventId;
      return invitations.filter((inv) => inv.event_id === realId);
    },
    [invitations]
  );

  /* ─── 다가오는 일정 (오늘 + 미래, 시간순) ─── */
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);

    return filteredEvents
      .filter((e) => {
        const start = new Date(e.start_at).getTime();
        const end = new Date(e.end_at || e.start_at).getTime();
        /* 아직 끝나지 않은 일정 (진행 중 + 미래) */
        return end >= now && start <= weekLater.getTime();
      })
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .slice(0, 10);
  }, [filteredEvents]);

  /* ─── 다음 일정 (가장 가까운 미래 1개) ─── */
  const nextEvent = useMemo(() => {
    const now = Date.now();
    return upcomingEvents.find((e) => new Date(e.start_at).getTime() > now) || null;
  }, [upcomingEvents]);

  /* ─── 오늘 일정 ─── */
  const todayEvents = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    return filteredEvents.filter((e) => {
      const eDate = new Date(e.start_at);
      return eDate.toDateString() === todayStr;
    });
  }, [filteredEvents]);

  /* ─── 5분 전 알림 체크 (1분마다) ─── */
  useEffect(() => {
    if (!user) return;

    const checkReminders = () => {
      const now = Date.now();
      const fiveMinLater = now + 5 * 60 * 1000;

      for (const event of upcomingEvents) {
        const startTs = new Date(event.start_at).getTime();
        if (startTs > now && startTs <= fiveMinLater) {
          const key = event.id;
          if (reminderSentRef.current.has(key)) continue;
          reminderSentRef.current.add(key);

          /* 토스트 */
          const minLeft = Math.max(1, Math.round((startTs - now) / 60000));
          toast.info(
            `📅 ${minLeft}분 후 일정: ${event.title}`,
            { duration: 8000 }
          );

          /* 알림 센터에도 기록 */
          createNotification({
            toUserId: user.id,
            type: 'system',
            title: `📅 곧 시작: ${event.title}`,
            body: `${minLeft}분 후 시작 — ${new Date(event.start_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`,
            link: '/schedule',
            refId: event.id,
          });
        }
      }
    };

    /* 즉시 1회 + 매 1분마다 */
    checkReminders();
    const intervalId = setInterval(checkReminders, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [upcomingEvents, user, toast, createNotification]);

  /* ─── 모달 제어 ─── */
  const openCreateModal = useCallback((defaultDate = null) => {
    setEventModal({ open: true, event: null, defaultDate });
  }, []);
  const openEditModal = useCallback((event) => {
    /* 반복 인스턴스의 경우 원본 이벤트로 변환 */
    if (event.is_recurring_instance) {
      const original = events.find((e) => e.id === event.original_id);
      setEventModal({ open: true, event: original || event, defaultDate: null });
    } else {
      setEventModal({ open: true, event, defaultDate: null });
    }
  }, [events]);
  const closeEventModal = useCallback(() => {
    setEventModal({ open: false, event: null, defaultDate: null });
  }, []);

  const canEdit = useCallback(
    (event) => event && user && event.author_id === user.id,
    [user]
  );

  /* Provider value */
  const value = useMemo(() => ({
    /* 데이터 */
    events,
    filteredEvents,
    invitations,
    myPendingInvitations,
    invitationsByEvent,
    upcomingEvents,
    nextEvent,
    todayEvents,
    loading,
    /* 뷰 상태 */
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    /* 카테고리 */
    activeCategories,
    toggleCategory,
    /* 검색 */
    searchKeyword,
    setSearchKeyword,
    /* CRUD */
    fetchEvents,
    fetchInvitations,
    createEvent,
    updateEvent,
    deleteEvent,
    moveEvent,    // ← 추가
    respondToInvitation,
    canEdit,
    /* 모달 */
    eventModal,
    openCreateModal,
    openEditModal,
    closeEventModal,
  }), [
    events, filteredEvents, invitations, myPendingInvitations, invitationsByEvent,
    upcomingEvents, nextEvent, todayEvents, loading,
    viewMode, currentDate, activeCategories, toggleCategory,
    searchKeyword,
    fetchEvents, fetchInvitations,
    createEvent, updateEvent, deleteEvent, moveEvent, 
    respondToInvitation, canEdit,
    eventModal, openCreateModal, openEditModal, closeEventModal,
  ]);

  return (
    <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider');
  return ctx;
}