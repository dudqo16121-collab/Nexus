// contexts/DecisionsContext.jsx
// 의사결정 추적기 — 모든 회의 캔버스의 결정/액션을 횡단으로 모아 제공.
//
// 데이터 모델:
//   meeting_decisions (수만 건 가능) 를 효율적으로 보기 위해
//   캔버스 정보를 같이 join 해서 표시.

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DecisionsContext = createContext(null);

export function DecisionsProvider({ children }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);    // [{ decision, canvas }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── 전체 로드 ──
     1) 내가 host 거나 참석자인 캔버스 목록을 먼저 구하고
     2) 그 캔버스들의 decisions 를 모두 가져오는 방식.
     PostgREST 의 한계로 join 이 복잡하니까 클라이언트에서 묶음. */
  const fetchAll = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      /* 1) 접근 가능한 캔버스 id 목록 */
      const { data: hostedCanvases, error: e1 } = await supabase
        .from('meeting_canvases')
        .select('id, title, phase, host_id, host_name, scheduled_at, ended_at, booking_id, location')
        .eq('host_id', user.id);
      if (e1) throw e1;

      const { data: attendeeRows, error: e2 } = await supabase
        .from('meeting_attendees')
        .select('canvas_id, meeting_canvases(id, title, phase, host_id, host_name, scheduled_at, ended_at, booking_id, location)')
        .eq('user_id', user.id);
      if (e2) throw e2;

      const canvasMap = new Map();
      (hostedCanvases || []).forEach((c) => canvasMap.set(c.id, c));
      (attendeeRows || []).forEach((r) => {
        if (r.meeting_canvases) canvasMap.set(r.meeting_canvases.id, r.meeting_canvases);
      });

      const canvasIds = Array.from(canvasMap.keys());
      if (canvasIds.length === 0) {
        setRows([]);
        return;
      }

      /* 2) 그 캔버스들의 decisions */
      const { data: decisions, error: e3 } = await supabase
        .from('meeting_decisions')
        .select('*')
        .in('canvas_id', canvasIds)
        .order('created_at', { ascending: false });
      if (e3) throw e3;

      const combined = (decisions || []).map((d) => ({
        decision: d,
        canvas: canvasMap.get(d.canvas_id) || null,
      }));

      setRows(combined);
    } catch (e) {
      console.error('[Decisions] fetchAll:', e);
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── 필터링/검색 상태 ── */
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');     // all|decision|action|question|note
  const [phaseFilter, setPhaseFilter] = useState('all');   // all|post|archived (pre/live 는 미완 결정)
  const [resolvedFilter, setResolvedFilter] = useState('all'); // all|open|resolved (액션 전용)
  const [convertedFilter, setConvertedFilter] = useState('all'); // all|converted|not-converted (액션 전용)

  /* ── 필터링된 결과 ── */
  const filtered = useMemo(() => {
    let list = rows;

    /* 타입 */
    if (typeFilter !== 'all') {
      list = list.filter((r) => r.decision.type === typeFilter);
    }

    /* 회의 단계 */
    if (phaseFilter !== 'all') {
      list = list.filter((r) => r.canvas?.phase === phaseFilter);
    }

    /* 해결 상태 (액션) */
    if (resolvedFilter !== 'all') {
      list = list.filter((r) => {
        if (r.decision.type !== 'action') return resolvedFilter === 'all';
        return resolvedFilter === 'resolved' ? r.decision.resolved : !r.decision.resolved;
      });
    }

    /* 변환 상태 (액션) */
    if (convertedFilter !== 'all') {
      list = list.filter((r) => {
        if (r.decision.type !== 'action') return convertedFilter === 'all';
        return convertedFilter === 'converted' ? !!r.decision.task_id : !r.decision.task_id;
      });
    }

    /* 검색 */
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        (r.decision.content || '').toLowerCase().includes(q)
        || (r.decision.owner_name || '').toLowerCase().includes(q)
        || (r.canvas?.title || '').toLowerCase().includes(q)
        || (r.canvas?.host_name || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [rows, search, typeFilter, phaseFilter, resolvedFilter, convertedFilter]);

  /* ── 통계 ── */
  const stats = useMemo(() => {
    const s = {
      total: rows.length,
      decision: 0, action: 0, question: 0, note: 0,
      actionsOpen: 0, actionsResolved: 0, actionsConverted: 0,
      archived: 0,
    };
    rows.forEach((r) => {
      s[r.decision.type] = (s[r.decision.type] || 0) + 1;
      if (r.decision.type === 'action') {
        if (r.decision.resolved) s.actionsResolved++;
        else s.actionsOpen++;
        if (r.decision.task_id) s.actionsConverted++;
      }
      if (r.canvas?.phase === 'archived') s.archived++;
    });
    return s;
  }, [rows]);

  const value = {
    rows,
    filtered,
    stats,
    loading,
    error,
    search, setSearch,
    typeFilter, setTypeFilter,
    phaseFilter, setPhaseFilter,
    resolvedFilter, setResolvedFilter,
    convertedFilter, setConvertedFilter,
    refresh: fetchAll,
  };

  return <DecisionsContext.Provider value={value}>{children}</DecisionsContext.Provider>;
}

export function useDecisions() {
  const ctx = useContext(DecisionsContext);
  if (!ctx) throw new Error('useDecisions must be used within <DecisionsProvider>');
  return ctx;
}