// contexts/SystemLogContext.jsx
// 시스템 로그 데이터 + 어디서든 호출 가능한 logEvent 헬퍼.
//
// 조회: 관리자만 (RLS)
// 기록: 누구나 — 결재/로그인/관리 동작 등에서 호출

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const SystemLogContext = createContext(null);

const PAGE_SIZE = 50;

/* 카테고리 메타 */
export const LOG_CATEGORIES = [
  { value: 'all',      label: '전체' },
  { value: 'auth',     label: '인증',    icon: 'fa-key',         color: '#4361ee' },
  { value: 'approval', label: '결재',    icon: 'fa-stamp',       color: '#f72585' },
  { value: 'admin',    label: '관리',    icon: 'fa-user-shield', color: '#8338ec' },
  { value: 'data',     label: '데이터',  icon: 'fa-database',    color: '#06d6a0' },
  { value: 'system',   label: '시스템',  icon: 'fa-server',      color: '#6b7280' },
];

/* 레벨 메타 */
export const LOG_LEVELS = {
  info:     { label: '정보',  icon: 'fa-circle-info',         color: '#3b82f6' },
  warn:     { label: '경고',  icon: 'fa-triangle-exclamation',color: '#f59e0b' },
  error:    { label: '오류',  icon: 'fa-circle-xmark',        color: '#ef4444' },
  critical: { label: '심각',  icon: 'fa-skull-crossbones',    color: '#dc2626' },
};

export function SystemLogProvider({ children }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    level: 'all',
    category: 'all',
    keyword: '',
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ── 로그 조회 ── */
  const fetchLogs = useCallback(async (page = 0) => {
    if (!isAdmin) {
      setLogs([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      let q = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filters.level !== 'all') {
        q = q.eq('level', filters.level);
      }
      if (filters.category !== 'all') {
        q = q.eq('category', filters.category);
      }
      if (filters.keyword.trim()) {
        q = q.ilike('message', `%${filters.keyword.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      if (!mountedRef.current) return;
      if (page === 0) {
        setLogs(data || []);
      } else {
        setLogs((prev) => [...prev, ...(data || [])]);
      }
      setHasMore((data || []).length === PAGE_SIZE);
    } catch (e) {
      console.error('[SystemLog] fetch:', e);
      if (mountedRef.current) {
        setLogs([]);
        setHasMore(false);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isAdmin, filters]);

  /* 필터 변경 시 자동 재조회 */
  useEffect(() => {
    if (isAdmin) fetchLogs(0);
  }, [isAdmin, filters, fetchLogs]);

  /* ── 로그 기록 — 어디서든 호출 ── */
  const logEvent = useCallback(
    async (level, category, message, opts = {}) => {
      try {
        const { error } = await supabase.rpc('log_system_event', {
          p_level: level,
          p_category: category,
          p_message: message,
          p_actor_id: opts.actorId || user?.id || null,
          p_actor_name: opts.actorName || profile?.full_name || null,
          p_ref_type: opts.refType || null,
          p_ref_id: opts.refId ? String(opts.refId) : null,
          p_meta: opts.meta || {},
        });
        if (error) throw error;
      } catch (e) {
        /* 로그 기록 실패는 무시 — 본 작업 흐름 방해 X */
        console.warn('[SystemLog] logEvent failed:', e);
      }
    },
    [user, profile]
  );

  /* ── 로그 삭제 (관리자 전용) ── */
  const deleteLog = useCallback(async (id) => {
    if (!isAdmin) return { ok: false, error: '권한이 없습니다.' };
    try {
      const { error } = await supabase.from('system_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs((prev) => prev.filter((l) => l.id !== id));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [isAdmin]);

  /* ── 전체 삭제 (관리자 전용) ── */
  const clearLogs = useCallback(async () => {
    if (!isAdmin) return { ok: false };
    try {
      /* 모든 로그 삭제 — id > 0 조건 (delete all 방지 우회) */
      const { error } = await supabase.from('system_logs').delete().gt('id', 0);
      if (error) throw error;
      setLogs([]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [isAdmin]);

  /* 통계 */
  const stats = useMemo(() => {
    const s = { total: logs.length, info: 0, warn: 0, error: 0, critical: 0 };
    logs.forEach((l) => {
      if (l.level in s) s[l.level]++;
    });
    return s;
  }, [logs]);

  return (
    <SystemLogContext.Provider
      value={{
        logs,
        loading,
        hasMore,
        filters,
        setFilters,
        fetchLogs,
        logEvent,
        deleteLog,
        clearLogs,
        stats,
        isAdmin,
      }}
    >
      {children}
    </SystemLogContext.Provider>
  );
}

export function useSystemLog() {
  const ctx = useContext(SystemLogContext);
  if (!ctx) throw new Error('useSystemLog must be used within SystemLogProvider');
  return ctx;
}