// components/dashboard/DashboardProjects.jsx
// 원본 #dashboard-projects 섹션 + renderDashboardProjects() 의 React 이관.
//
// 원본 거동 유지:
//  - 진행 중인 프로젝트만 필터 (status: done/completed/archived 제외, archived flag 제외)
//  - 마감일 가까운 순 정렬, 마감일 없는 항목은 뒤로
//  - 최대 4개 노출
//  - 카드 클릭 시 /project?id=xxx 로 이동 (다음 대화에서 페이지가 ?id= 받아 선택)
//  - "전체 보기" 클릭 시 /project 이동
//  - 데이터 없으면 빈 상태 placeholder
//
// 데이터 소스:
//  - 현재는 자체적으로 supabase 에서 projects 를 fetch (stand-alone)
//  - 다음 대화에 ProjectContext 들어오면 useProject() 로 캐시 공유 리팩토링 가능
//  - 데모 모드(비로그인): 원본 fetchProjects() 의 더미 3개와 동일

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../common/Skeleton';

/* 원본 PRIORITY_META 와 동일 */
const PRIORITY_META = {
  low:    { label: '낮음', icon: '🔵' },
  medium: { label: '보통', icon: '⚪' },
  high:   { label: '높음', icon: '🟠' },
  urgent: { label: '긴급', icon: '🔴' },
};

/* 데모 더미 — 원본 fetchProjects() 의 비로그인 폴백 */
const DEMO_PROJECTS = [
  { id: 'p1', title: '2026 모바일 앱 개발', status: 'in-progress', priority: 'high',
    color: '#4361ee', progress: 65, end_date: '2026-06-30' },
  { id: 'p2', title: '신규 입사자 온보딩', status: 'todo', priority: 'medium',
    color: '#06d6a0', progress: 10, end_date: '2026-06-01' },
  { id: 'p3', title: '사내 보안 시스템 업데이트', status: 'done', priority: 'urgent',
    color: '#f72585', progress: 100, end_date: '2026-04-15' },
];

/* ── 헬퍼: 원본 _calcDday, _ddayClass, _formatShortDate, _lighten 이관 ── */
function calcDday(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
}

function ddayClass(dday) {
  if (dday === null) return '';
  if (dday < 0)   return 'dday-overdue';
  if (dday <= 3)  return 'dday-urgent';
  if (dday <= 7)  return 'dday-near';
  return '';
}

function formatShortDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${m}/${day}`;
}

/* HEX 컬러를 밝게 — 그라데이션 끝색용 */
function lighten(hex, percent) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  const num = parseInt(hex.slice(1), 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, ((num >> 16) & 0xff) + amt);
  const g = Math.min(255, ((num >> 8)  & 0xff) + amt);
  const b = Math.min(255,  (num        & 0xff) + amt);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export default function DashboardProjects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);

  /* 프로젝트 fetch — 원본 fetchProjects() 와 동일 */
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        // 데모 모드
        setProjects(DEMO_PROJECTS);
        return;
      }
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (e) {
      console.error('[DashboardProjects] fetch error:', e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /* 진행 중만 필터 + 마감 가까운 순 + 최대 4개 */
  const inProgress = projects
    .filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s !== 'done' && s !== 'completed' && s !== 'archived' && p.archived !== true;
    })
    .sort((a, b) => {
      if (!a.end_date) return 1;
      if (!b.end_date) return -1;
      return new Date(a.end_date) - new Date(b.end_date);
    })
    .slice(0, 4);

  /* 카드 클릭 — 프로젝트 페이지로 이동 + 선택 프로젝트는 쿼리로 전달 */
  const goToProject = (projectId) => {
    navigate(`/project?id=${encodeURIComponent(projectId)}`);
  };
  const goToProjectList = () => navigate('/project');

  return (
    <section className="panel" id="dashboard-projects">
      <div className="panel-header" style={{ marginBottom: 15 }}>
        <h2>
          <i className="fa-solid fa-diagram-project" style={{ color: 'var(--primary-color)', marginRight: 8 }} />
          진행 중인 프로젝트
        </h2>
        <span
          style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--primary-color)', fontWeight: 600 }}
          onClick={goToProjectList}
        >
          전체 보기 <i className="fa-solid fa-arrow-right" style={{ marginLeft: 3 }} />
        </span>
      </div>

      <div className="project-list" id="dashboard-project-list">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton height="14px" width="60%" />
                  <Skeleton height="14px" width="40px" />
                </div>
                <Skeleton height="6px" radius="3px" />
              </div>
            ))}
          </div>
        ) : inProgress.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
            <i className="fa-regular fa-folder-open" style={{ fontSize: '2rem', display: 'block', marginBottom: 10, opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem' }}>진행 중인 프로젝트가 없습니다.</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: 4 }}>새 프로젝트를 만들어 시작해보세요!</p>
          </div>
        ) : (
          inProgress.map((p) => {
            const pct = Math.max(0, Math.min(100, Number(p.progress) || 0));
            const dday = calcDday(p.end_date);
            const cls = ddayClass(dday);
            const endLabel = formatShortDate(p.end_date);
            const priorityMeta = PRIORITY_META[p.priority] || null;
            const color = p.color || 'var(--primary-color)';
            const fillStyle = {
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}, ${lighten(color, 25)})`,
            };

            return (
              <div
                key={p.id}
                className="project-item"
                data-project-id={p.id}
                onClick={() => goToProject(p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goToProject(p.id); }}
              >
                <div className="project-item-head">
                  <div className="project-title-group">
                    <span className="project-color-dot" style={{ background: color }} />
                    <strong className="project-name" title={p.title || ''}>
                      {p.title || '제목 없음'}
                    </strong>
                  </div>
                  {dday !== null && (
                    <span className={`project-dday ${cls}`}>
                      {dday >= 0 ? `D-${dday}` : `D+${Math.abs(dday)}`}
                    </span>
                  )}
                </div>
                <div className="project-meta">
                  {priorityMeta && (
                    <span title={`우선순위: ${priorityMeta.label}`}>
                      {priorityMeta.icon} {priorityMeta.label}
                    </span>
                  )}
                  {endLabel && (
                    <span><i className="fa-regular fa-calendar" /> ~ {endLabel}</span>
                  )}
                  <span className="project-percent">{pct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={fillStyle} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}