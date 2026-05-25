// components/admin/AdminAttendanceTab.jsx
// 관리자 근태 탭 — 상단 KPI + 부서별/타임라인/주간 트렌드 종합 분석.

import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* 시간 → "분 전" / "방금 전" */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${Math.floor(diff)}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return `${Math.floor(diff / 1440)}일 전`;
}

/* 근무시간 */
function calcWorkHours(ci, co) {
  if (!ci) return null;
  const end = co ? new Date(co) : new Date();
  return (end - new Date(ci)) / 3_600_000;
}

/* 부서별 색상 — 일관된 시각화 */
function deptColor(dept, idx) {
  const palette = ['#4361ee', '#06d6a0', '#f72585', '#ff9f1c', '#8338ec', '#3aafa9', '#ec4899'];
  return palette[idx % palette.length];
}

/* 주간(월~일) 범위 */
function getThisWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const toDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: toDateStr(monday), end: toDateStr(sunday), monday, sunday };
}

export default function AdminAttendanceTab() {
  const toast = useToast();
  const {
    attendanceRows,
    attendanceKpi,
    attendanceLoading,
    loadAttendance,
    resetAllAttendance,
  } = useAdmin();

  const [weekData, setWeekData] = useState([]);
  const [weekLoading, setWeekLoading] = useState(false);

  /* 탭 진입 시 로드 + 1분마다 갱신 — 출퇴근 버튼 동기화 */
  useEffect(() => {
    loadAttendance();
    const t = setInterval(loadAttendance, 60_000);
    return () => clearInterval(t);
  }, [loadAttendance]);

  /* 주간 출근 데이터 — 일별 출근 건수 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setWeekLoading(true);
      const { start, end, monday } = getThisWeekRange();
      const { data, error } = await supabase
        .from('attendance')
        .select('created_at, check_in, user_id')
        .gte('created_at', start)
        .lte('created_at', end);

      if (cancelled) return;
      if (error) {
        console.error('[AdminAttendance] week load:', error);
        setWeekLoading(false);
        return;
      }

      /* 일별 그룹핑 */
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const label = ['월', '화', '수', '목', '금', '토', '일'][i];
        const count = (data || []).filter(
          (r) => r.created_at === ds && r.check_in
        ).length;
        days.push({
          label,
          date: ds,
          count,
          isToday: ds === todayStr(),
          isWeekend: i >= 5,
        });
      }
      setWeekData(days);
      setWeekLoading(false);
    })();
    return () => { cancelled = true; };
  }, [attendanceRows]);

  /* 날짜 레이블 */
  const dateLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  /* 부서별 통계 */
  const deptStats = useMemo(() => {
    if (!attendanceRows || attendanceRows.length === 0) return [];
    const map = new Map();
    attendanceRows.forEach(({ profile: emp, record }) => {
      const dept = emp.department || '미지정';
      if (!map.has(dept)) {
        map.set(dept, { dept, total: 0, attended: 0, working: 0, checkedOut: 0 });
      }
      const stat = map.get(dept);
      stat.total += 1;
      if (record?.check_in) {
        stat.attended += 1;
        if (record?.check_out) stat.checkedOut += 1;
        else stat.working += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [attendanceRows]);

  /* 오늘 출근 타임라인 — 시간순 (최신순) */
  const timeline = useMemo(() => {
    if (!attendanceRows) return [];
    return attendanceRows
      .filter(({ record }) => record?.check_in)
      .map(({ profile: emp, record }) => ({
        id: emp.id,
        name: emp.full_name || emp.email?.split('@')[0] || '직원',
        department: emp.department,
        check_in: record.check_in,
        check_out: record.check_out,
        status: record.status,
        worked: calcWorkHours(record.check_in, record.check_out),
      }))
      .sort((a, b) => new Date(b.check_in) - new Date(a.check_in));
  }, [attendanceRows]);

  /* 평균 근무시간 (퇴근 완료자) */
  const avgWorked = useMemo(() => {
    const closed = timeline.filter((t) => t.check_out);
    if (closed.length === 0) return null;
    return closed.reduce((s, t) => s + t.worked, 0) / closed.length;
  }, [timeline]);

  /* 가장 빨리 출근한 사람 (얼리버드) */
  const earlyBird = useMemo(() => {
    if (timeline.length === 0) return null;
    return [...timeline].sort(
      (a, b) => new Date(a.check_in) - new Date(b.check_in)
    )[0];
  }, [timeline]);

  /* 주간 최고 일수 */
  const weekMax = useMemo(
    () => Math.max(...weekData.map((d) => d.count), 1),
    [weekData]
  );

  const handleResetAll = async () => {
    if (!window.confirm(
      '⚠️ 오늘의 출퇴근 기록을 전체 초기화하시겠습니까?\n\n' +
        '• 모든 직원의 오늘 출근/퇴근 시간이 삭제됩니다.\n' +
        '• 이 작업은 되돌릴 수 없습니다.'
    )) return;
    const result = await resetAllAttendance();
    if (result.ok) toast.success('오늘의 출퇴근 기록이 초기화되었습니다.');
    else toast.error(`초기화 실패: ${result.error || ''}`);
  };

  return (
    <div style={{ color: 'var(--text-main)' }}>
      {/* ─── 상단 KPI 3개 (그대로 유지) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="widget" style={{ boxShadow: 'none', border: '1px solid var(--border-color)' }}>
          <h3>금일 출근 현황</h3>
          <div className="count" style={{ fontSize: '1.4rem' }}>
            {attendanceLoading ? '- / - 명' : `${attendanceKpi.attended} / ${attendanceKpi.total} 명`}
          </div>
        </div>
        <div className="widget" style={{ boxShadow: 'none', border: '1px solid var(--border-color)' }}>
          <h3>금일 미출근</h3>
          <div className="count" style={{ fontSize: '1.4rem', color: 'var(--danger)' }}>
            {attendanceLoading ? '- 명' : `${attendanceKpi.absent} 명`}
          </div>
        </div>
        <div className="widget" style={{ boxShadow: 'none', border: '1px solid var(--border-color)' }}>
          <h3>금일 퇴근 완료</h3>
          <div className="count" style={{ fontSize: '1.4rem', color: 'var(--success)' }}>
            {attendanceLoading ? '- 명' : `${attendanceKpi.checkout} 명`}
          </div>
        </div>
      </div>

      {/* ─── 헤더 ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          <i className="fa-solid fa-chart-pie" style={{ color: 'var(--primary-color)', marginRight: 6 }} />
          근태 종합 분석{' '}
          <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            {dateLabel}
          </span>
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={loadAttendance}
            style={{
              padding: '7px 14px',
              fontSize: '0.83rem',
              border: '1px solid var(--border-color)',
              background: 'var(--panel-bg)',
              color: 'var(--text-main)',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <i className="fa-solid fa-rotate-right" /> 새로고침
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            style={{
              padding: '7px 14px',
              fontSize: '0.83rem',
              background: 'var(--danger)',
              color: '#fff',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <i className="fa-solid fa-rotate-left" /> 초기화
          </button>
        </div>
      </div>

      {/* ─── 메인 그리드: 좌(부서별) + 우(타임라인) ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* 좌측 — 부서별 출근율 */}
        <div
          className="widget"
          style={{ boxShadow: 'none', border: '1px solid var(--border-color)', padding: 20 }}
        >
          <h3 style={{ marginBottom: 14, color: 'var(--text-main)' }}>
            <i className="fa-solid fa-building" style={{ color: 'var(--primary-color)', marginRight: 6 }} />
            부서별 출근 현황
          </h3>
          {deptStats.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
              데이터가 없어요
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deptStats.map((stat, idx) => {
                const rate = stat.total > 0 ? (stat.attended / stat.total) * 100 : 0;
                const color = deptColor(stat.dept, idx);
                return (
                  <div key={stat.dept}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                        fontSize: '0.88rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{stat.dept}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <strong style={{ color }}>{stat.attended}</strong> / {stat.total} 명
                        <span style={{ marginLeft: 6, fontWeight: 700, color }}>
                          ({rate.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: 'var(--bg-2)',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${rate}%`,
                          background: color,
                          transition: 'width 0.4s',
                        }}
                      />
                    </div>
                    {stat.working > 0 && (
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                          marginTop: 3,
                        }}
                      >
                        근무 중 {stat.working}명 · 퇴근 {stat.checkedOut}명
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 우측 — 오늘 출근 타임라인 */}
        <div
          className="widget"
          style={{ boxShadow: 'none', border: '1px solid var(--border-color)', padding: 20 }}
        >
          <h3 style={{ marginBottom: 14, color: 'var(--text-main)' }}>
            <i className="fa-solid fa-clock" style={{ color: '#06d6a0', marginRight: 6 }} />
            오늘 출근 타임라인
          </h3>
          {timeline.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fa-regular fa-clock" style={{ fontSize: '2rem', marginBottom: 8, display: 'block', opacity: 0.4 }} />
              아직 아무도 출근하지 않았어요
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
              {timeline.map((t) => {
                const isWorking = !t.check_out;
                const isLate = t.status === '지각';
                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: isWorking ? '#22c55e' : '#9ca3af',
                        flexShrink: 0,
                        boxShadow: isWorking ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
                      }}
                    />
                    <div style={{ minWidth: 50, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: 'var(--text-main)' }}>
                      {fmtTime(t.check_in)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {t.name}
                        {t.department && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                            {t.department}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {timeAgo(t.check_in)}
                        {t.check_out && ` · ${fmtTime(t.check_out)} 퇴근`}
                      </div>
                    </div>
                    {isLate && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(255,159,28,0.12)',
                          color: 'var(--warning)',
                          fontWeight: 700,
                        }}
                      >
                        지각
                      </span>
                    )}
                    {isWorking && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(34,197,94,0.12)',
                          color: '#22c55e',
                          fontWeight: 700,
                        }}
                      >
                        근무중
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── 하단: 주간 트렌드 + 인사이트 ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
        }}
      >
        {/* 주간 출근 추이 */}
        <div
          className="widget"
          style={{ boxShadow: 'none', border: '1px solid var(--border-color)', padding: 20 }}
        >
          <h3 style={{ marginBottom: 16, color: 'var(--text-main)' }}>
            <i className="fa-solid fa-chart-column" style={{ color: '#8338ec', marginRight: 6 }} />
            이번 주 출근 추이
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
            {weekData.map((d) => {
              const heightPct = (d.count / weekMax) * 100;
              return (
                <div
                  key={d.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', minHeight: 18 }}>
                    {d.count > 0 ? d.count : ''}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      flex: 1,
                      background: 'var(--bg-2)',
                      borderRadius: 6,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${heightPct}%`,
                        background: d.isToday
                          ? 'linear-gradient(180deg, var(--primary-color), #7048e8)'
                          : d.isWeekend
                          ? 'rgba(148,163,184,0.4)'
                          : 'rgba(67,97,238,0.4)',
                        transition: 'height 0.4s',
                        borderRadius: 6,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: d.isToday ? 700 : 600,
                      color: d.isToday ? 'var(--primary-color)' : d.isWeekend ? 'var(--text-muted)' : 'var(--text-main)',
                    }}
                  >
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 인사이트 */}
        <div
          className="widget"
          style={{ boxShadow: 'none', border: '1px solid var(--border-color)', padding: 20 }}
        >
          <h3 style={{ marginBottom: 14, color: 'var(--text-main)' }}>
            <i className="fa-solid fa-lightbulb" style={{ color: '#f59e0b', marginRight: 6 }} />
            인사이트
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {earlyBird && (
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                  🐦 오늘의 얼리버드
                </div>
                <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 600 }}>
                  {earlyBird.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>· {fmtTime(earlyBird.check_in)}</span>
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                ⏱ 평균 근무시간 (퇴근 완료자)
              </div>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {avgWorked !== null ? `${avgWorked.toFixed(1)}시간` : '아직 없음'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                📊 출근율
              </div>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {attendanceKpi.total > 0
                  ? `${((attendanceKpi.attended / attendanceKpi.total) * 100).toFixed(0)}%`
                  : '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                💼 현재 근무 중
              </div>
              <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {timeline.filter((t) => !t.check_out).length}명
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}