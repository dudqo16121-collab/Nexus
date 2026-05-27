// src/contexts/ContextLinksContext.jsx
// 횡단 연결 조회 — entity (kind + id) 에 연결된 모든 다른 자산을 찾아준다.
//
// 지원 엔티티 종류:
//   - task        : 칸반 카드/태스크
//   - approval    : 결재 문서
//   - wiki        : 위키 문서
//   - meeting     : 회의 캔버스
//   - project     : 프로젝트
//
// 반환 데이터 모양 (resolveLinks):
//   {
//     meetings:  [{ id, title, phase, scheduled_at, host_name, _reason }, ...],
//     decisions: [{ id, type, content, canvas_id, canvas_title, ... }],
//     tasks:     [{ id, title, status, project_id, project_title, ... }],
//     approvals: [{ id, type, title, status, doc_number, ... }],
//     wikis:     [{ id, title, category, updated_at, ... }],
//     projects:  [{ id, title, status, ... }],
//   }
//
// 캐시: 동일 (kind,id) 는 60초간 메모. 화면 여러 곳에서 동시 호출해도 한 번만 쿼리.

import {
  createContext, useContext, useCallback, useRef,
} from 'react';
import { supabase } from '../lib/supabase';

const ContextLinksContext = createContext(null);
const CACHE_TTL_MS = 60_000;

export function ContextLinksProvider({ children }) {
  /* (kind:id) -> { ts, data } */
  const cacheRef = useRef(new Map());

  const getCache = (key) => {
    const hit = cacheRef.current.get(key);
    if (!hit) return null;
    if (Date.now() - hit.ts > CACHE_TTL_MS) {
      cacheRef.current.delete(key);
      return null;
    }
    return hit.data;
  };
  const setCache = (key, data) => {
    cacheRef.current.set(key, { ts: Date.now(), data });
  };
  const invalidate = useCallback((kind, id) => {
    if (kind && id) cacheRef.current.delete(`${kind}:${id}`);
    else cacheRef.current.clear();
  }, []);

  /* ── 핵심: 한 엔티티에 연결된 모든 다른 자산 모으기 ──
     각 출발점마다 어디를 뒤져야 하는지 다르므로 분기. */
  const resolveLinks = useCallback(async ({ kind, id }) => {
    if (!kind || !id) return emptyResult();
    const cacheKey = `${kind}:${id}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    let result = emptyResult();
    try {
      switch (kind) {
        case 'task':     result = await resolveForTask(id);     break;
        case 'approval': result = await resolveForApproval(id); break;
        case 'wiki':     result = await resolveForWiki(id);     break;
        case 'meeting':  result = await resolveForMeeting(id);  break;
        case 'project':  result = await resolveForProject(id);  break;
        default: break;
      }
    } catch (e) {
      console.error('[ContextLinks] resolveLinks', kind, id, e);
    }
    setCache(cacheKey, result);
    return result;
  }, []);

  return (
    <ContextLinksContext.Provider value={{ resolveLinks, invalidate }}>
      {children}
    </ContextLinksContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────
   엔티티별 resolver — 각각 같은 모양의 객체를 반환
   ───────────────────────────────────────────────────────── */
function emptyResult() {
  return { meetings: [], decisions: [], tasks: [], approvals: [], wikis: [], projects: [] };
}

/* TASK → 어느 회의 결정에서 만들어진 카드인가? */
async function resolveForTask(taskId) {
  const out = emptyResult();

  // 1) meeting_decisions.task_id 로 역추적
  const { data: decisions } = await supabase
    .from('meeting_decisions')
    .select('id, type, content, canvas_id, owner_name, due_date, created_at')
    .eq('task_id', taskId);

  if (decisions?.length) {
    out.decisions = decisions.map((d) => ({ ...d, _reason: '이 카드는 회의 액션에서 변환됨' }));
    const canvasIds = [...new Set(decisions.map((d) => d.canvas_id))];
    const { data: canvases } = await supabase
      .from('meeting_canvases')
      .select('id, title, phase, scheduled_at, host_name')
      .in('id', canvasIds);
    out.meetings = (canvases || []).map((c) => ({ ...c, _reason: '이 카드가 만들어진 회의' }));
  }

  // 2) 태스크의 프로젝트
  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single();
  if (task?.project_id) {
    const { data: p } = await supabase
      .from('projects')
      .select('id, title, status')
      .eq('id', task.project_id)
      .single();
    if (p) out.projects = [{ ...p, _reason: '이 카드가 속한 프로젝트' }];
  }

  return out;
}

/* APPROVAL → 어느 회의에서 첨부됐는가? + 자동 생성된 일정 등 */
async function resolveForApproval(approvalId) {
  const out = emptyResult();

  // 회의 첨부 (kind='approval', ref_id=approvalId)
  const { data: atts } = await supabase
    .from('meeting_attachments')
    .select('canvas_id, title')
    .eq('kind', 'approval')
    .eq('ref_id', approvalId);

  if (atts?.length) {
    const canvasIds = [...new Set(atts.map((a) => a.canvas_id))];
    const { data: canvases } = await supabase
      .from('meeting_canvases')
      .select('id, title, phase, scheduled_at, host_name')
      .in('id', canvasIds);
    out.meetings = (canvases || []).map((c) => ({ ...c, _reason: '이 결재가 첨부된 회의' }));
  }

  return out;
}

/* WIKI → 어느 회의에 첨부됐는가? + 백링크는 위키 자체에서 처리 중 */
async function resolveForWiki(wikiId) {
  const out = emptyResult();

  const { data: atts } = await supabase
    .from('meeting_attachments')
    .select('canvas_id, title')
    .eq('kind', 'wiki_link')
    .eq('ref_id', wikiId);

  if (atts?.length) {
    const canvasIds = [...new Set(atts.map((a) => a.canvas_id))];
    const { data: canvases } = await supabase
      .from('meeting_canvases')
      .select('id, title, phase, scheduled_at, host_name')
      .in('id', canvasIds);
    out.meetings = (canvases || []).map((c) => ({ ...c, _reason: '이 문서가 첨부된 회의' }));
  }

  return out;
}

/* MEETING → 거꾸로 펼치기. 이 회의가 만든/연결된 모든 것 */
async function resolveForMeeting(canvasId) {
  const out = emptyResult();

  // 1) 결정/액션
  const { data: decisions } = await supabase
    .from('meeting_decisions')
    .select('id, type, content, task_id, owner_name, due_date, resolved')
    .eq('canvas_id', canvasId);
  out.decisions = (decisions || []).map((d) => ({ ...d, _reason: '회의에서 기록된 결정/액션' }));

  // 2) 결정 → 태스크 변환된 것들
  const taskIds = (decisions || []).map((d) => d.task_id).filter(Boolean);
  if (taskIds.length) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, project_id, due_date')
      .in('id', taskIds);
    out.tasks = (tasks || []).map((t) => ({ ...t, _reason: '회의 액션에서 만들어진 카드' }));
  }

  // 3) 첨부된 자산들 분해
  const { data: atts } = await supabase
    .from('meeting_attachments')
    .select('id, kind, ref_id, title, url')
    .eq('canvas_id', canvasId);

  const wikiIds = (atts || []).filter((a) => a.kind === 'wiki_link' && a.ref_id).map((a) => a.ref_id);
  const apprIds = (atts || []).filter((a) => a.kind === 'approval'  && a.ref_id).map((a) => a.ref_id);
  const projIds = (atts || []).filter((a) => a.kind === 'project'   && a.ref_id).map((a) => a.ref_id);

  if (wikiIds.length) {
    const { data: w } = await supabase
      .from('wiki_documents')
      .select('id, title, category, updated_at')
      .in('id', wikiIds);
    out.wikis = (w || []).map((x) => ({ ...x, _reason: '회의에 첨부된 위키 문서' }));
  }
  if (apprIds.length) {
    const { data: ap } = await supabase
      .from('approvals')
      .select('id, type, title, status, doc_number, drafter_name')
      .in('id', apprIds);
    out.approvals = (ap || []).map((x) => ({ ...x, _reason: '회의에 첨부된 결재' }));
  }
  if (projIds.length) {
    const { data: p } = await supabase
      .from('projects')
      .select('id, title, status')
      .in('id', projIds);
    out.projects = (p || []).map((x) => ({ ...x, _reason: '회의에 첨부된 프로젝트' }));
  }

  return out;
}

/* PROJECT → 이 프로젝트의 태스크 중 회의 액션에서 온 것 / 회의에 첨부된 이력 */
async function resolveForProject(projectId) {
  const out = emptyResult();

  // 1) 이 프로젝트의 태스크 중 task_id 가 meeting_decisions 에 있는 것
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, due_date')
    .eq('project_id', projectId);

  const taskIdSet = new Set((tasks || []).map((t) => t.id));
  if (taskIdSet.size > 0) {
    const { data: decisions } = await supabase
      .from('meeting_decisions')
      .select('id, type, content, canvas_id, task_id')
      .in('task_id', [...taskIdSet]);
    if (decisions?.length) {
      out.decisions = decisions.map((d) => ({ ...d, _reason: '이 프로젝트의 카드를 만든 회의 액션' }));
      const canvasIds = [...new Set(decisions.map((d) => d.canvas_id))];
      const { data: canvases } = await supabase
        .from('meeting_canvases')
        .select('id, title, phase, scheduled_at, host_name')
        .in('id', canvasIds);
      out.meetings = (canvases || []).map((c) => ({ ...c, _reason: '이 프로젝트와 관련된 회의' }));
    }
  }

  // 2) 회의 첨부로도 등장하는지 (별도 회의들)
  const { data: atts } = await supabase
    .from('meeting_attachments')
    .select('canvas_id')
    .eq('kind', 'project')
    .eq('ref_id', projectId);

  if (atts?.length) {
    const newCanvasIds = atts
      .map((a) => a.canvas_id)
      .filter((cid) => !out.meetings.some((m) => m.id === cid));
    if (newCanvasIds.length) {
      const { data: more } = await supabase
        .from('meeting_canvases')
        .select('id, title, phase, scheduled_at, host_name')
        .in('id', newCanvasIds);
      out.meetings = [
        ...out.meetings,
        ...(more || []).map((c) => ({ ...c, _reason: '이 프로젝트가 첨부된 회의' })),
      ];
    }
  }

  return out;
}

export const useContextLinks = () => {
  const ctx = useContext(ContextLinksContext);
  if (!ctx) throw new Error('useContextLinks must be used within ContextLinksProvider');
  return ctx;
};