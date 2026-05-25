// contexts/WellbeingContext.jsx
// Well-being 체크인 — 데이터 / 통계 / 인사이트.

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const WellbeingContext = createContext(null);

export const MOODS = [
  { em: '😄', label: '최고예요',     score: 10, color: '#06d6a0' },
  { em: '😊', label: '좋아요',       score: 8,  color: '#4cc9f0' },
  { em: '😐', label: '보통이에요',   score: 6,  color: '#ffd166' },
  { em: '😔', label: '힘들어요',     score: 4,  color: '#ff9f1c' },
  { em: '😞', label: '매우 힘들어요', score: 2,  color: '#f72585' },
];

export const TAGS_POSITIVE = ['✅ 성과 달성', '💪 활력 넘침', '🤝 팀워크 좋음', '🎯 집중 잘 됨', '🌟 배움이 많음'];
export const TAGS_NEUTRAL  = ['📅 평범한 하루', '🌧 날씨 영향', '💻 회의 많음', '🍜 점심이 맛있었음', '🚶 산책 했음'];
export const TAGS_NEGATIVE = ['😵 업무 과부하', '💤 수면 부족', '🤯 스트레스', '🔁 반복 업무', '🗣 대인 갈등', '🏠 재택 외로움', '⏰ 시간 부족', '😶 의미 부재'];

const todayStr = () => new Date().toISOString().slice(0, 10);

export function WellbeingProvider({ children }) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.is_admin === true;

  const [myCheckins, setMyCheckins] = useState([]);    // 내 모든 체크인
  const [allCheckins, setAllCheckins] = useState([]);  // 전사 (관리자만 전체, 일반은 최근 30일분만 익명 통계용으로)
  const [loading, setLoading] = useState(true);

  /* fetch */
  const fetchMy = useCallback(async () => {
    if (!user) { setMyCheckins([]); return; }
    const { data, error } = await supabase
      .from('wellbeing_checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('check_date', { ascending: false })
      .limit(180);
    if (error) {
      console.error('[Wellbeing] fetchMy:', error);
      setMyCheckins([]);
    } else setMyCheckins(data || []);
  }, [user]);

  const fetchAll = useCallback(async () => {
    /* RLS가 권한에 따라 자동 필터.
       관리자: 전체 / 일반: 본인 (그래서 fallback 으로 myCheckins 와 동일).
       전사 통계는 관리자만 정확. 일반 사용자는 myCheckins 만으로 화면 그림. */
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data, error } = await supabase
      .from('wellbeing_checkins')
      .select('*')
      .gte('check_date', since.toISOString().slice(0, 10));
    if (error) {
      console.error('[Wellbeing] fetchAll:', error);
      setAllCheckins([]);
    } else setAllCheckins(data || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMy(), fetchAll()]);
    setLoading(false);
  }, [fetchMy, fetchAll]);

  useEffect(() => { refresh(); }, [refresh]);

  /* === 오늘 체크인 === */
  const todayCheckin = useMemo(
    () => myCheckins.find((c) => c.check_date === todayStr()) || null,
    [myCheckins]
  );

  /* === 연속 일수 (streak) === */
  const streak = useMemo(() => {
    if (myCheckins.length === 0) return 0;
    const dates = new Set(myCheckins.map((c) => c.check_date));
    let count = 0;
    let cur = new Date();
    while (true) {
      const k = cur.toISOString().slice(0, 10);
      if (dates.has(k)) {
        count++;
        cur.setDate(cur.getDate() - 1);
      } else {
        /* 오늘 아직 안 했어도 어제부터 연속이면 streak 유지 */
        if (count === 0 && k === todayStr()) {
          cur.setDate(cur.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return count;
  }, [myCheckins]);

  /* === 내 평균 (최근 7일) === */
  const myAvg = useMemo(() => {
    const recent = myCheckins.slice(0, 7);
    if (recent.length === 0) return null;
    const avg = (k) => recent.reduce((s, c) => s + (c[k] || 0), 0) / recent.length;
    return {
      mood:    avg('mood_score'),
      energy:  avg('energy'),
      burnout: avg('burnout'),
      focus:   avg('focus'),
      count:   recent.length,
    };
  }, [myCheckins]);

  /* === 전사 통계 (오늘) === */
  const todayStats = useMemo(() => {
    const t = todayStr();
    const today = allCheckins.filter((c) => c.check_date === t);
    if (today.length === 0) {
      return { count: 0, avgMood: 0, avgEnergy: 0, avgBurnout: 0, avgFocus: 0, score: 0 };
    }
    const avg = (k) => today.reduce((s, c) => s + (c[k] || 0), 0) / today.length;
    const m = avg('mood_score'), e = avg('energy'), b = avg('burnout'), f = avg('focus');
    return {
      count: today.length,
      avgMood: m,
      avgEnergy: e,
      avgBurnout: b,
      avgFocus: f,
      score: Math.round((m + e + (10 - b) + f) / 4 * 10) / 10,
    };
  }, [allCheckins]);

  /* === 부서별 통계 (관리자 화면) === */
  const deptStats = useMemo(() => {
    const map = {};
    for (const c of allCheckins) {
      const d = c.department || '미지정';
      if (!map[d]) map[d] = { count: 0, mood: 0, energy: 0, burnout: 0, focus: 0 };
      map[d].count++;
      map[d].mood += c.mood_score || 0;
      map[d].energy += c.energy || 0;
      map[d].burnout += c.burnout || 0;
      map[d].focus += c.focus || 0;
    }
    return Object.entries(map).map(([dept, s]) => ({
      dept,
      count: s.count,
      avgMood: s.mood / s.count,
      avgEnergy: s.energy / s.count,
      avgBurnout: s.burnout / s.count,
      avgFocus: s.focus / s.count,
      score: Math.round((s.mood/s.count + s.energy/s.count + (10 - s.burnout/s.count) + s.focus/s.count) / 4 * 10) / 10,
    })).sort((a, b) => b.count - a.count);
  }, [allCheckins]);

  /* === 7일 트렌드 === */
  const trend7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map((day) => {
      const items = allCheckins.filter((c) => c.check_date === day);
      if (items.length === 0) return { date: day, score: null, count: 0 };
      const avg = (k) => items.reduce((s, c) => s + (c[k] || 0), 0) / items.length;
      const m = avg('mood_score'), e = avg('energy'), b = avg('burnout'), f = avg('focus');
      return {
        date: day,
        score: Math.round((m + e + (10 - b) + f) / 4 * 10) / 10,
        count: items.length,
      };
    });
  }, [allCheckins]);

  /* === 알림 (관리자) === */
  const alerts = useMemo(() => {
    const list = [];
    /* 1. 오늘 참여율 */
    const totalProfiles = 30; /* TODO: 전체 직원 수로 대체 가능 */
    const participRate = todayStats.count / totalProfiles;
    if (participRate < 0.5 && todayStats.count > 0) {
      list.push({
        level: 'low', icon: '🟢', dept: '전체',
        msg: `오늘 참여율 ${Math.round(participRate * 100)}% — 목표(50%) 미달`,
        detail: 'Well-being 체크인 참여 독려 공지 권고',
      });
    }
    /* 2. 부서별 평균 번아웃 위험 */
    for (const d of deptStats) {
      if (d.avgBurnout >= 7) {
        list.push({
          level: 'high', icon: '🔴', dept: d.dept,
          msg: `${d.dept} 부서 평균 번아웃 ${d.avgBurnout.toFixed(1)}/10`,
          detail: '부서장 1on1 미팅 또는 휴식 권고 필요',
        });
      } else if (d.avgBurnout >= 5) {
        list.push({
          level: 'med', icon: '🟡', dept: d.dept,
          msg: `${d.dept} 부서 평균 번아웃 ${d.avgBurnout.toFixed(1)}/10`,
          detail: '주의 깊은 모니터링 필요',
        });
      }
      if (d.avgMood <= 4) {
        list.push({
          level: 'high', icon: '🔴', dept: d.dept,
          msg: `${d.dept} 부서 평균 기분 점수 낮음 (${d.avgMood.toFixed(1)}/10)`,
          detail: '심층 면담 검토 필요',
        });
      }
    }
    return list;
  }, [deptStats, todayStats]);

  /* === 인사이트 === */
  const insights = useMemo(() => {
    const list = [];
    if (myCheckins.length >= 3) {
      const best = [...myCheckins].sort((a, b) => (b.mood_score || 0) - (a.mood_score || 0))[0];
      if (best) {
        const mood = MOODS.find((m) => m.score === best.mood_score) || MOODS[2];
        list.push({
          icon: '✨',
          title: '최근 가장 좋았던 날',
          text: `${best.check_date} — ${mood.em} ${mood.label}`,
        });
      }
    }
    /* 번아웃 추세 */
    if (myCheckins.length >= 5) {
      const recent5 = myCheckins.slice(0, 5).map((c) => c.burnout || 0);
      const avg = recent5.reduce((a, b) => a + b, 0) / 5;
      if (avg >= 6) {
        list.push({
          icon: '⚠️',
          title: '번아웃 주의',
          text: `최근 5일 평균 번아웃 ${avg.toFixed(1)}/10 — 휴식을 권해요`,
        });
      } else if (avg <= 3) {
        list.push({
          icon: '💪',
          title: '컨디션 양호',
          text: `최근 5일 평균 번아웃 ${avg.toFixed(1)}/10 — 좋은 페이스 유지 중`,
        });
      }
    }
    return list;
  }, [myCheckins]);

  /* === 액션 — 체크인 저장/업데이트 === */
  const submitCheckin = useCallback(async (payload) => {
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };
    const today = todayStr();
    const row = {
      user_id: user.id,
      check_date: today,
      mood_score: payload.mood_score,
      mood_label: payload.mood_label || '',
      energy: payload.energy ?? 5,
      burnout: payload.burnout ?? 3,
      focus: payload.focus ?? 5,
      tags: payload.tags || [],
      note: payload.note || '',
      department: profile?.department || null,
    };
    try {
      /* 오늘 이미 있으면 업데이트 */
      const existing = todayCheckin;
      if (existing) {
        const { data, error } = await supabase
          .from('wellbeing_checkins')
          .update(row)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        setMyCheckins((prev) => prev.map((c) => (c.id === existing.id ? data : c)));
        setAllCheckins((prev) => prev.map((c) => (c.id === existing.id ? data : c)));
        return { ok: true, checkin: data };
      } else {
        const { data, error } = await supabase
          .from('wellbeing_checkins')
          .insert([row])
          .select()
          .single();
        if (error) throw error;
        setMyCheckins((prev) => [data, ...prev]);
        setAllCheckins((prev) => [data, ...prev]);
        return { ok: true, checkin: data };
      }
    } catch (e) {
      console.error('[Wellbeing] submitCheckin:', e);
      return { ok: false, error: e.message || '저장 실패' };
    }
  }, [user, profile, todayCheckin]);

  return (
    <WellbeingContext.Provider value={{
      isAdmin, loading,
      MOODS, TAGS_POSITIVE, TAGS_NEUTRAL, TAGS_NEGATIVE,
      myCheckins, allCheckins,
      todayCheckin, streak, myAvg, insights,
      todayStats, deptStats, trend7, alerts,
      submitCheckin, refresh,
    }}>
      {children}
    </WellbeingContext.Provider>
  );
}

export function useWellbeing() {
  const ctx = useContext(WellbeingContext);
  if (!ctx) throw new Error('useWellbeing must be used within WellbeingProvider');
  return ctx;
}