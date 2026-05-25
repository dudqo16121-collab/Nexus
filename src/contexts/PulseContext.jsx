// contexts/PulseContext.jsx
// 펄스 서베이 — 설문 정의 + 응답 + 집계.

import {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { deptToBucket, tenureToBucket, currentISOWeek } from '../lib/feedbackBucket';
import { hashUserForPulse } from '../lib/pulseHash';
import { ANONYMITY_THRESHOLD } from '../config/pulseTypes';

const PulseContext = createContext(null);

export function PulseProvider({ children }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;
  const { createBulkNotifications } = useNotification();

  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);          // 전체 응답 (집계용)
  const [myResponseHashes, setMyResponseHashes] = useState(new Set()); // 내가 응답한 survey_id 집합
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ─── fetch ──────────────────────────────────────────── */
  const fetchSurveys = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('pulse_surveys')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setSurveys(data || []);
    } catch (e) {
      console.error('[Pulse] fetchSurveys:', e);
      setError(e.message);
      setSurveys([]);
    }
  }, []);

  const fetchResponses = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('pulse_responses')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (err) throw err;
      setResponses(data || []);
    } catch (e) {
      console.error('[Pulse] fetchResponses:', e);
      setResponses([]);
    }
  }, []);

  /* 내가 응답한 설문 ID 추출 — 클라이언트에서 해시 비교 */
  const fetchMyResponseStatus = useCallback(async () => {
    if (!user || surveys.length === 0) {
      setMyResponseHashes(new Set());
      return;
    }
    try {
      const mine = new Set();
      for (const s of surveys) {
        const myHash = await hashUserForPulse(user.id, s.id);
        const found = responses.find(
          (r) => r.survey_id === s.id && r.user_hash === myHash
        );
        if (found) mine.add(s.id);
      }
      setMyResponseHashes(mine);
    } catch (e) {
      console.warn('[Pulse] fetchMyResponseStatus:', e);
    }
  }, [user, surveys, responses]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchSurveys(), fetchResponses()]);
    setLoading(false);
  }, [fetchSurveys, fetchResponses]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { fetchMyResponseStatus(); }, [fetchMyResponseStatus]);

  /* ─── 파생 데이터 ────────────────────────────────────── */

  /* 현재 활성 설문들 — 내가 응답 안 했고 진행 중인 것 */
  const activeSurveys = useMemo(() => {
    const now = Date.now();
    return surveys.filter(
      (s) =>
        s.status === 'active' &&
        new Date(s.end_at).getTime() > now &&
        new Date(s.start_at).getTime() <= now
    );
  }, [surveys]);

  /* 내가 아직 응답 안 한 활성 설문 */
  const pendingSurveys = useMemo(
    () => activeSurveys.filter((s) => !myResponseHashes.has(s.id)),
    [activeSurveys, myResponseHashes]
  );

  /* ─── 액션 ────────────────────────────────────────────── */

  /* 관리자: 설문 생성 */
  const createSurvey = useCallback(
    async (payload) => {
      if (!user || !isAdmin) return { ok: false, error: '권한 없음' };
      try {
        const row = {
          title: (payload.title || '').trim(),
          description: payload.description || null,
          questions: payload.questions || [],
          start_at: payload.start_at || new Date().toISOString(),
          end_at: payload.end_at,
          status: payload.status || 'draft',
          created_by: user.id,
          created_by_name: profile?.full_name || '관리자',
        };
        const { data, error: err } = await supabase
          .from('pulse_surveys')
          .insert([row])
          .select()
          .single();
        if (err) throw err;
        await fetchSurveys();
        return { ok: true, survey: data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [user, profile, isAdmin, fetchSurveys]
  );

  /* 관리자: 설문 업데이트 */
  const updateSurvey = useCallback(
    async (id, patch) => {
      if (!isAdmin) return { ok: false, error: '권한 없음' };
      try {
        const { error: err } = await supabase
          .from('pulse_surveys')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (err) throw err;
        await fetchSurveys();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [isAdmin, fetchSurveys]
  );

  /* 관리자: 설문 삭제 */
  const deleteSurvey = useCallback(
    async (id) => {
      if (!isAdmin) return { ok: false, error: '권한 없음' };
      try {
        const { error: err } = await supabase
          .from('pulse_surveys')
          .delete()
          .eq('id', id);
        if (err) throw err;
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
    [isAdmin, refresh]
  );

  /* 관리자: 설문 활성화 + 전사 알림 */
  const activateSurvey = useCallback(
    async (id) => {
      if (!isAdmin) return { ok: false, error: '권한 없음' };
      const survey = surveys.find((s) => s.id === id);
      if (!survey) return { ok: false, error: '설문 없음' };

      const res = await updateSurvey(id, { status: 'active' });
      if (!res.ok) return res;

      // 전사 알림 발송 (본인 제외)
      try {
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_active', true);
        const ids = (allUsers || []).map((u) => u.id);
        if (ids.length > 0) {
          await createBulkNotifications(ids, {
            type: 'feedback',
            title: '📋 새 설문이 시작됐어요',
            body: `"${survey.title}" — 1~2분만 시간 내주세요`,
            link: '/feedback',
            refId: id,
          });
        }
      } catch (e) {
        console.warn('[Pulse] activate notification:', e);
      }

      return { ok: true };
    },
    [isAdmin, surveys, updateSurvey, createBulkNotifications]
  );

  /* 직원: 응답 제출 */
  const submitResponse = useCallback(
    async (surveyId, answers) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다' };
      try {
        const userHash = await hashUserForPulse(user.id, surveyId);
        const { error: err } = await supabase.rpc('ps_submit_response', {
          p_survey_id: surveyId,
          p_answers: answers,
          p_dept_bucket: deptToBucket(profile?.department),
          p_tenure_bucket: tenureToBucket(profile?.hire_date),
          p_submitted_week: currentISOWeek(),
          p_user_hash: userHash,
        });
        if (err) throw err;
        await refresh();
        return { ok: true };
      } catch (e) {
        console.error('[Pulse] submitResponse:', e);
        // RPC raise exception 메시지 매핑
        const msg = e.message || '';
        if (msg.includes('already_responded')) {
          return { ok: false, error: '이미 응답하셨어요' };
        }
        if (msg.includes('survey_expired')) {
          return { ok: false, error: '설문이 마감됐어요' };
        }
        if (msg.includes('survey_not_active')) {
          return { ok: false, error: '진행 중인 설문이 아니에요' };
        }
        return { ok: false, error: msg || '제출 실패' };
      }
    },
    [user, profile, refresh]
  );

  /* 설문별 집계 (결과 화면용) */
  const aggregateSurvey = useCallback(
    (surveyId) => {
      const survey = surveys.find((s) => s.id === surveyId);
      if (!survey) return null;

      const surveyResponses = responses.filter((r) => r.survey_id === surveyId);
      const total = surveyResponses.length;

      const byQuestion = {};
      (survey.questions || []).forEach((q) => {
        if (q.type === 'scale') {
          const vals = surveyResponses
            .map((r) => Number(r.answers?.[q.id]))
            .filter((v) => !Number.isNaN(v));
          const sum = vals.reduce((a, b) => a + b, 0);
          byQuestion[q.id] = {
            type: 'scale',
            count: vals.length,
            avg: vals.length ? sum / vals.length : 0,
            distribution: vals.reduce((acc, v) => {
              acc[v] = (acc[v] || 0) + 1;
              return acc;
            }, {}),
          };
        } else if (q.type === 'choice') {
          const counts = {};
          (q.options || []).forEach((opt) => { counts[opt] = 0; });
          surveyResponses.forEach((r) => {
            const v = r.answers?.[q.id];
            if (v && counts[v] !== undefined) counts[v]++;
          });
          byQuestion[q.id] = { type: 'choice', counts, total };
        } else if (q.type === 'text') {
          const texts = surveyResponses
            .map((r) => r.answers?.[q.id])
            .filter((t) => typeof t === 'string' && t.trim().length > 0);
          byQuestion[q.id] = { type: 'text', count: texts.length, texts };
        }
      });

      // 부서별 분리 (N≥THRESHOLD 만)
      const byDept = {};
      surveyResponses.forEach((r) => {
        if (!r.dept_bucket) return;
        if (!byDept[r.dept_bucket]) byDept[r.dept_bucket] = [];
        byDept[r.dept_bucket].push(r);
      });
      const deptAggregates = Object.entries(byDept)
        .filter(([, list]) => list.length >= ANONYMITY_THRESHOLD)
        .map(([dept, list]) => ({ dept, count: list.length, responses: list }));

      return {
        survey,
        total,
        byQuestion,
        deptAggregates,
        hiddenDeptCount: Object.keys(byDept).length - deptAggregates.length,
      };
    },
    [surveys, responses]
  );

  /* ─── value ──────────────────────────────────────────── */
  const value = {
    surveys,
    activeSurveys,
    pendingSurveys,
    myResponseHashes,
    responses,
    loading,
    error,
    isAdmin,
    // 액션
    refresh,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    activateSurvey,
    submitResponse,
    aggregateSurvey,
    // 헬퍼
    isResponded: (sid) => myResponseHashes.has(sid),
    ANONYMITY_THRESHOLD,
  };

  return (
    <PulseContext.Provider value={value}>{children}</PulseContext.Provider>
  );
}

export function usePulse() {
  const ctx = useContext(PulseContext);
  if (!ctx) throw new Error('usePulse must be used within <PulseProvider>');
  return ctx;
}