// contexts/MeetingCanvasContext.jsx
// 회의 캔버스 — 메인 컨텍스트.
//
// 설계:
//   - 회의 1건의 모든 데이터 (캔버스 + 참석자 + 안건 + 결정 + 첨부)를 한 번에 로드.
//   - 목록 페이지에서는 가벼운 list 만 fetch.
//   - 변경마다 명시적 refetch (Realtime 미사용 — Phase 2 에서 검토).

import {
  createContext, useContext, useState, useCallback, useEffect, useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import {
  DEFAULT_DURATION_MIN, MIN_TITLE_LENGTH, MAX_TITLE_LENGTH,
} from '../config/meetingCanvasConfig';
import { useContextLinks } from './ContextLinksContext';

const MeetingCanvasContext = createContext(null);

export function MeetingCanvasProvider({ children }) {
  const { user, profile } = useAuth();
  const { createBulkNotifications, createNotification } = useNotification();
  const { invalidate: invalidateContextLinks } = useContextLinks();

  /* 내가 관련된 회의 목록 (host 또는 참석자) — 가벼운 정보만 */
  const [myMeetings, setMyMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);

  /* 현재 열린 회의의 풀 데이터 */
  const [current, setCurrent] = useState(null);
  const [currentLoading, setCurrentLoading] = useState(false);

  /* ─── 목록 fetch ───────────────────────────────────────── */
  const fetchMyMeetings = useCallback(async () => {
    if (!user) {
      setMyMeetings([]);
      setMeetingsLoading(false);
      return;
    }
    setMeetingsLoading(true);
    try {
      // host 인 회의 + 참석자로 등록된 회의 (id 기준 unique)
      const { data: hosted, error: e1 } = await supabase
        .from('meeting_canvases')
        .select('*')
        .eq('host_id', user.id)
        .order('scheduled_at', { ascending: false, nullsFirst: false })
        .limit(100);
      if (e1) throw e1;

      const { data: attended, error: e2 } = await supabase
        .from('meeting_attendees')
        .select('canvas_id, meeting_canvases(*)')
        .eq('user_id', user.id)
        .limit(100);
      if (e2) throw e2;

      const map = new Map();
      (hosted || []).forEach((m) => map.set(m.id, m));
      (attended || []).forEach((row) => {
        if (row.meeting_canvases) map.set(row.meeting_canvases.id, row.meeting_canvases);
      });

      const list = Array.from(map.values()).sort((a, b) => {
        const ta = new Date(a.scheduled_at || a.created_at).getTime();
        const tb = new Date(b.scheduled_at || b.created_at).getTime();
        return tb - ta;
      });
      setMyMeetings(list);
    } catch (e) {
      console.error('[MeetingCanvas] fetchMyMeetings:', e);
      setMyMeetings([]);
    } finally {
      setMeetingsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchMyMeetings(); }, [fetchMyMeetings]);

  /* ─── 단일 회의 풀 데이터 fetch ────────────────────────── */
  const fetchCanvas = useCallback(async (canvasId) => {
    if (!canvasId) {
      setCurrent(null);
      return;
    }
    setCurrentLoading(true);
    try {
      const [
        { data: canvas, error: e1 },
        { data: attendees, error: e2 },
        { data: agenda, error: e3 },
        { data: decisions, error: e4 },
        { data: attachments, error: e5 },
      ] = await Promise.all([
        supabase.from('meeting_canvases').select('*').eq('id', canvasId).single(),
        supabase.from('meeting_attendees').select('*').eq('canvas_id', canvasId),
        supabase.from('meeting_agenda_items').select('*').eq('canvas_id', canvasId).order('position'),
        supabase.from('meeting_decisions').select('*').eq('canvas_id', canvasId).order('created_at'),
        supabase.from('meeting_attachments').select('*').eq('canvas_id', canvasId).order('added_at'),
      ]);

      if (e1) throw e1;
      if (e2 || e3 || e4 || e5) console.warn('partial fetch:', e2, e3, e4, e5);

      setCurrent({
        canvas,
        attendees: attendees || [],
        agendaItems: agenda || [],
        decisions: decisions || [],
        attachments: attachments || [],
      });
    } catch (e) {
      console.error('[MeetingCanvas] fetchCanvas:', e);
      setCurrent(null);
    } finally {
      setCurrentLoading(false);
    }
  }, []);
/* 🔔 회의 시작 임박 알림 — 15분 전, 본인이 host 인 경우만, 1회만 */
  useEffect(() => {
    if (!user || !myMeetings?.length) return;

    const checkUpcoming = () => {
      const now = new Date();
      const seenKey = 'nexus_meeting_reminded_v1';
      let seen = {};
      try { seen = JSON.parse(sessionStorage.getItem(seenKey) || '{}'); } catch {}

      for (const m of myMeetings) {
        if (m.phase !== 'pre') continue;
        if (m.host_id !== user.id) continue;     // host만
        if (!m.scheduled_at) continue;
        if (seen[m.id]) continue;

        const t = new Date(m.scheduled_at);
        const diffMin = Math.round((t - now) / 60000);
        if (diffMin >= 0 && diffMin <= 15) {
          /* 시작 임박 토스트 — Toast 컨텍스트가 외부 import 안 되니까 콘솔만 */
          console.log(`[MeetingReminder] "${m.title}" 곧 시작 (${diffMin}분 후)`);
          if (typeof window !== 'undefined' && window.__nexusToast) {
            window.__nexusToast.info(
              `🎙️ "${m.title}" 회의가 ${diffMin}분 후 시작이에요`,
              { duration: 8000 }
            );
          }
          seen[m.id] = true;
        }
      }
      try { sessionStorage.setItem(seenKey, JSON.stringify(seen)); } catch {}
    };

    checkUpcoming();
    const id = setInterval(checkUpcoming, 60 * 1000);   // 1분마다
    return () => clearInterval(id);
  }, [user, myMeetings]);
  /* current 부분 갱신용 — 풀 fetch 보다 가벼움 */
  const refreshCurrent = useCallback(async () => {
    if (current?.canvas?.id) {
      await fetchCanvas(current.canvas.id);
    }
  }, [current?.canvas?.id, fetchCanvas]);

  /* ─── 파생 데이터 ──────────────────────────────────────── */
  const upcomingMeetings = useMemo(() => {
    const now = Date.now();
    return myMeetings.filter(
      (m) => m.phase !== 'archived' && m.phase !== 'post'
        && m.scheduled_at && new Date(m.scheduled_at).getTime() > now - 3600_000
    );
  }, [myMeetings]);

  const meetingsByPhase = useMemo(() => {
    const groups = { pre: [], live: [], post: [], archived: [] };
    myMeetings.forEach((m) => {
      if (groups[m.phase]) groups[m.phase].push(m);
    });
    return groups;
  }, [myMeetings]);

  /* ─── 액션: 캔버스 생성 ────────────────────────────────── */
  const createCanvas = useCallback(async (payload) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    const title = (payload.title || '').trim();
    if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH) {
      return { ok: false, error: '제목을 입력해주세요.' };
    }
    const hostName =
      profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '익명';

    try {
      const { data, error: err } = await supabase
        .from('meeting_canvases')
        .insert([{
          title,
          booking_id: payload.booking_id || null,
          scheduled_at: payload.scheduled_at || null,
          duration_min: payload.duration_min || DEFAULT_DURATION_MIN,
          location: payload.location || null,
          phase: 'pre',
          host_id: user.id,
          host_name: hostName,
          agenda: payload.agenda || null,
        }])
        .select()
        .single();
      if (err) throw err;

      // host 본인을 참석자로 자동 추가
      await supabase
        .from('meeting_attendees')
        .insert([{
          canvas_id: data.id,
          user_id: user.id,
          user_name: hostName,
          role: 'host',
          status: 'accepted',
        }]);

      // 추가 참석자가 있으면 같이 추가
      if (Array.isArray(payload.attendees) && payload.attendees.length > 0) {
        const rows = payload.attendees
          .filter((a) => a.user_id && a.user_id !== user.id)
          .map((a) => ({
            canvas_id: data.id,
            user_id: a.user_id,
            user_name: a.user_name || null,
            role: a.role || 'attendee',
            status: 'pending',
          }));
        if (rows.length > 0) {
          await supabase.from('meeting_attendees').insert(rows);
        }
      }

      await fetchMyMeetings();
      return { ok: true, canvas: data };
    } catch (e) {
      console.error('[MeetingCanvas] createCanvas:', e);
      return { ok: false, error: e.message };
    }
  }, [user, profile, fetchMyMeetings]);

  /* ─── 액션: 캔버스 수정 ────────────────────────────────── */
  const updateCanvas = useCallback(async (canvasId, patch) => {
    try {
      const { error: err } = await supabase
        .from('meeting_canvases')
        .update(patch)
        .eq('id', canvasId);
      if (err) throw err;
      await Promise.all([fetchMyMeetings(), refreshCurrent()]);
      return { ok: true };
    } catch (e) {
      console.error('[MeetingCanvas] updateCanvas:', e);
      return { ok: false, error: e.message };
    }
  }, [fetchMyMeetings, refreshCurrent]);

  /* ─── 액션: 단계 전환 ──────────────────────────────────── */
  const transitionPhase = useCallback(async (canvasId, newPhase) => {
    const patch = { phase: newPhase };
    if (newPhase === 'live') patch.started_at = new Date().toISOString();
    if (newPhase === 'post') patch.ended_at = new Date().toISOString();
    return updateCanvas(canvasId, patch);
  }, [updateCanvas]);

  /* ─── 액션: 캔버스 삭제 ────────────────────────────────── */
  const deleteCanvas = useCallback(async (canvasId) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    try {
      const { error: err } = await supabase
        .from('meeting_canvases')
        .delete()
        .eq('id', canvasId);
      if (err) throw err;
      if (current?.canvas?.id === canvasId) setCurrent(null);
      await fetchMyMeetings();
      return { ok: true };
    } catch (e) {
      console.error('[MeetingCanvas] deleteCanvas:', e);
      return { ok: false, error: e.message };
    }
  }, [user, current, fetchMyMeetings]);

  /* ─── 액션: 참석자 추가 ────────────────────────────────── */
  const addAttendee = useCallback(async (canvasId, attendee) => {
    try {
      const { error: err } = await supabase
        .from('meeting_attendees')
        .insert([{
          canvas_id: canvasId,
          user_id: attendee.user_id,
          user_name: attendee.user_name || null,
          role: attendee.role || 'attendee',
          status: 'pending',
        }]);
      if (err) throw err;

      // 초대 알림 발송
      const canvas = current?.canvas || myMeetings.find((m) => m.id === canvasId);
      if (canvas && createBulkNotifications) {
        try {
          await createBulkNotifications([attendee.user_id], {
            type: 'project',
            title: '회의에 초대됐어요',
            body: `"${canvas.title}" 회의에 ${canvas.host_name || '주최자'}님이 초대했어요`,
            link: `/meetings/${canvasId}`,
            refId: canvasId,
          });
        } catch (e) { console.warn('[addAttendee] notif:', e); }
      }

      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      console.error('[MeetingCanvas] addAttendee:', e);
      // unique 위반은 친절하게
      if (String(e.message).includes('duplicate')) {
        return { ok: false, error: '이미 추가된 참석자예요' };
      }
      return { ok: false, error: e.message };
    }
  }, [current, myMeetings, createBulkNotifications, refreshCurrent]);

  const removeAttendee = useCallback(async (canvasId, attendeeId) => {
    try {
      const { error: err } = await supabase
        .from('meeting_attendees').delete().eq('id', attendeeId);
      if (err) throw err;
      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [refreshCurrent]);

  const updateAttendeeStatus = useCallback(async (attendeeId, status) => {
    try {
      const { error: err } = await supabase
        .from('meeting_attendees')
        .update({ status })
        .eq('id', attendeeId);
      if (err) throw err;
      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [refreshCurrent]);

  /* ─── 액션: 안건 ───────────────────────────────────────── */
  const addAgendaItem = useCallback(async (canvasId, item) => {
    if (!item.topic?.trim()) return { ok: false, error: '안건 제목을 입력해주세요.' };
    const currentItems = current?.agendaItems || [];
    const nextPosition = currentItems.length;
    try {
      const { error: err } = await supabase
        .from('meeting_agenda_items')
        .insert([{
          canvas_id: canvasId,
          position: nextPosition,
          topic: item.topic.trim(),
          owner_id: item.owner_id || null,
          owner_name: item.owner_name || null,
          duration_min: item.duration_min || null,
        }]);
      if (err) throw err;
      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [current, refreshCurrent]);

  const updateAgendaItem = useCallback(async (itemId, patch) => {
    try {
      const { error: err } = await supabase
        .from('meeting_agenda_items').update(patch).eq('id', itemId);
      if (err) throw err;
      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [refreshCurrent]);

  const removeAgendaItem = useCallback(async (itemId) => {
    try {
      const { error: err } = await supabase
        .from('meeting_agenda_items').delete().eq('id', itemId);
      if (err) throw err;
      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [refreshCurrent]);

  /* ─── 액션: 결정/액션/질문/메모 ────────────────────────── */
  const addDecision = useCallback(async (canvasId, decision) => {
    if (!decision.content?.trim()) return { ok: false, error: '내용을 입력해주세요.' };
    const currentDecisions = current?.decisions || [];
    const nextPosition = currentDecisions.length;
    try {
      const { error: err } = await supabase
        .from('meeting_decisions')
        .insert([{
          canvas_id: canvasId,
          type: decision.type || 'note',
          content: decision.content.trim(),
          owner_id: decision.owner_id || null,
          owner_name: decision.owner_name || null,
          due_date: decision.due_date || null,
          tags: decision.tags || null,
          position: nextPosition,
        }]);
      if (err) throw err;
      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [current, refreshCurrent]);

  const updateDecision = useCallback(async (decisionId, patch) => {
    try {
      const { error: err } = await supabase
        .from('meeting_decisions').update(patch).eq('id', decisionId);
      if (err) throw err;
      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [refreshCurrent]);

  const removeDecision = useCallback(async (decisionId) => {
    try {
      const { error: err } = await supabase
        .from('meeting_decisions').delete().eq('id', decisionId);
      if (err) throw err;
      await refreshCurrent();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [refreshCurrent]);

  /* ─── 액션: 첨부 ───────────────────────────────────────── */
  const addAttachment = useCallback(async (canvasId, attachment) => {
    try {
      const { error: err } = await supabase
        .from('meeting_attachments')
        .insert([{
          canvas_id: canvasId,
          kind: attachment.kind,
          ref_id: attachment.ref_id || null,
          url: attachment.url || null,
          title: attachment.title || null,
          added_by: user?.id,
        }]);
      if (err) throw err;
      await refreshCurrent();
      // 🔗 ContextLinks 캐시 무효화 — 회의 + 첨부된 자산 종류별
      invalidateContextLinks('meeting', canvasId);
      if (attachment?.ref_id) {
        if (attachment.kind === 'approval') invalidateContextLinks('approval', attachment.ref_id);
        if (attachment.kind === 'wiki_link') invalidateContextLinks('wiki', attachment.ref_id);
        if (attachment.kind === 'project') invalidateContextLinks('project', attachment.ref_id);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [user, refreshCurrent, invalidateContextLinks]);

  const removeAttachment = useCallback(async (attachmentId) => {
    try {
      const { error: err } = await supabase
        .from('meeting_attachments').delete().eq('id', attachmentId);
      if (err) throw err;
      await refreshCurrent();
      // 🔗 회의 캐시 무효화
      if (canvasId) invalidateContextLinks('meeting', canvasId);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [refreshCurrent]);

  /* ─── 액션: 액션 → 칸반 카드 일괄 변환 ─────────────────── */
const convertActionsToTasks = useCallback(async (canvasId, projectId) => {
  if (!canvasId || !projectId) return { ok: false, error: 'canvas/project required' };
  try {
    const { data, error: err } = await supabase
      .rpc('mc_convert_actions_to_tasks', {
        p_canvas_id: canvasId,
        p_project_id: projectId,
      });
    if (err) throw err;
    await refreshCurrent();

    // 🔗 ContextLinks 캐시 무효화 — 회의/프로젝트/변환된 태스크 모두
    invalidateContextLinks('meeting', canvasId);
    invalidateContextLinks('project', projectId);
    (data || []).forEach((t) => {
      if (t?.id) invalidateContextLinks('task', t.id);
    });

    /* 🔔 변환된 카드의 담당자들에게 알림 발송
       — RPC 가 반환한 데이터에 assignee_id 가 없을 수 있으므로
         tasks 테이블에서 한 번 더 조회해서 정확히 가져온다. */
    try {
      const taskIds = (data || []).map((t) => t.id).filter(Boolean);
      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, assignee_id, due_date')
          .in('id', taskIds);

        const meetingTitle = current?.canvas?.title || '회의';

        (tasks || []).forEach((t) => {
          if (!t.assignee_id) return; // 담당자 없는 카드는 스킵
          const dueText = t.due_date ? ` (마감 ${t.due_date})` : '';
          createNotification({
            toUserId: t.assignee_id,
            type: 'task',
            title: '회의 액션이 카드로 할당됐어요',
            body: `"${meetingTitle}" → ${t.title}${dueText}`,
            link: `/project?id=${projectId}&task=${t.id}`,
            refId: t.id,
          });
        });
      }
    } catch (notifErr) {
      console.warn('[MeetingCanvas] convertActionsToTasks 알림 실패:', notifErr);
      /* 알림 실패해도 변환 결과는 그대로 반환 */
    }

    return { ok: true, converted: data || [] };
  } catch (e) {
    console.error('[MeetingCanvas] convertActionsToTasks:', e);
    return { ok: false, error: e.message };
  }
}, [refreshCurrent, invalidateContextLinks, current, createNotification]);


  /* ─── value ────────────────────────────────────────────── */
const clearCurrent = useCallback(() => setCurrent(null), []);
  const value = {
    // 목록
    myMeetings,
    upcomingMeetings,
    meetingsByPhase,
    meetingsLoading,
    fetchMyMeetings,

    // 현재 캔버스
    current,
    currentLoading,
    fetchCanvas,
    refreshCurrent,
    clearCurrent,

    // 캔버스 액션
    createCanvas,
    updateCanvas,
    transitionPhase,
    deleteCanvas,

    // 참석자
    addAttendee,
    removeAttendee,
    updateAttendeeStatus,

    // 안건
    addAgendaItem,
    updateAgendaItem,
    removeAgendaItem,

    // 결정/액션
    addDecision,
    updateDecision,
    removeDecision,

    // 첨부
    addAttachment,
    removeAttachment,

    // 변환
    convertActionsToTasks,
  };

  return (
    <MeetingCanvasContext.Provider value={value}>
      {children}
    </MeetingCanvasContext.Provider>
  );
}

export function useMeetingCanvas() {
  const ctx = useContext(MeetingCanvasContext);
  if (!ctx) throw new Error('useMeetingCanvas must be used within <MeetingCanvasProvider>');
  return ctx;
}