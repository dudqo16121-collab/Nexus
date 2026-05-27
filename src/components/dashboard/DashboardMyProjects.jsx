// src/components/dashboard/DashboardMyProjects.jsx
// 대시보드 글로벌 상황실 위젯 —
// 내가 owner 이거나 멤버인 모든 진행 중 프로젝트의 위험 신호를 요약.
//
// 위험 신호 정의:
//   - 지연 (overdue)   : status !== 'done' && due_date < today
//   - 긴급 (urgent)    : priority === 'urgent' && status !== 'done'
//   - 미할당 (no_owner): !assignee_id && status !== 'done'
//
// 데이터 소스: ProjectContext 의 projects + myMemberProjectIds.
// tasks 는 한 번에 가져온다 (project_id IN [...]).

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { supabase } from '../../lib/supabase';

export default function DashboardMyProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, myMemberProjectIds, loading: projectsLoading } = useProject();

  const [tasksByProject, setTasksByProject] = useState({}); // {pid: [tasks]}
  const [tasksLoading, setTasksLoading] = useState(true);

  /* 내 프로젝트 — owner 이거나 멤버이고 진행 중 */
  const myProjects = useMemo(() => {
    if (!user) return [];
    return (projects || [])
      .filter((p) => p.owner_id === user.id || myMemberProjectIds?.has?.(p.id))
      .filter((p) => {
        const s = (p.status || '').toLowerCase();
        return s !== 'done' && s !== 'completed' && s !== 'archived' && p.archived !== true;
      });
  }, [projects, user, myMemberProjectIds]);

  /* 전체 태스크 한 번에 가져오기 */
  useEffect(() => {
    if (myProjects.length === 0) {
      setTasksByProject({});
      setTasksLoading(false);
      return;
    }
    let cancelled = false;
    setTasksLoading(true);
    (async () => {
      try {
        const ids = myProjects.map((p) => p.id);
        const { data, error } = await supabase
          .from('tasks')
          .select('id, project_id, status, priority, assignee_id, due_date, title')
          .in('project_id', ids);
        if (error) throw error;
        if (cancelled) return;
        /* 프로젝트별 그룹핑 */
        const map = {};
        (data || []).forEach((t) => {
          if (!map[t.project_id]) map[t.project_id] = [];
          map[t.project_id].push(t);
        });
        setTasksByProject(map);
      } catch (e) {
        console.error('[DashboardMyProjects] fetch tasks:', e);
        if (!cancelled) setTasksByProject({});
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [myProjects]);

  /* 프로젝트별 위험 신호 계산 */
  const summaries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return myProjects.map((p) => {
      const tasks = tasksByProject[p.id] || [];
      const active = tasks.filter((t) => t.status !== 'done');

      const overdue = active.filter((t) => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < today;
      });
      const urgent = active.filter((t) => t.priority === 'urgent');
      const noOwner = active.filter((t) => !t.assignee_id);

      /* 중복 제거 — 우선순위 overdue > urgent > noOwner */
      const seen = new Set();
      overdue.forEach((t) => seen.add(t.id));
      const urgentOnly = urgent.filter((t) => !seen.has(t.id));
      urgentOnly.forEach((t) => seen.add(t.id));
      const noOwnerOnly = noOwner.filter((t) => !seen.has(t.id));

      const total = overdue.length + urgentOnly.length + noOwnerOnly.length;

      return {
        project: p,
        total,
        overdue: overdue.length,
        urgent: urgentOnly.length,
        noOwner: noOwnerOnly.length,
        activeCount: active.length,
      };
    })
    /* 위험 많은 순 — 위험 0개는 뒤로 */
    .sort((a, b) => b.total - a.total)
    /* 위젯 폭 고려해 최대 5개 */
    .slice(0, 5);
  }, [myProjects, tasksByProject]);

  const totalRisks = summaries.reduce((acc, s) => acc + s.total, 0);
  const loading = projectsLoading || tasksLoading;

  return (
    <section className="panel" id="dashboard-my-projects">
      <div className="panel-header" style={{ marginBottom: 15 }}>
        <h2>
          <i
            className="fa-solid fa-radar"
            style={{ color: '#f72585', marginRight: 8 }}
          />
          내 프로젝트 위험 신호
          {!loading && totalRisks > 0 && (
            <span className="dmp-total-badge">{totalRisks}</span>
          )}
        </h2>
        <span
          style={{
            fontSize: '0.85rem',
            cursor: 'pointer',
            color: 'var(--primary-color)',
            fontWeight: 600,
          }}
          onClick={() => navigate('/project')}
        >
          전체 보기{' '}
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: 3 }} />
        </span>
      </div>

      {loading ? (
        <div className="dmp-loading">
          <i className="fa-solid fa-spinner fa-spin" /> 위험 신호 분석 중...
        </div>
      ) : myProjects.length === 0 ? (
        <div className="dmp-empty">
          <i className="fa-regular fa-folder-open" />
          <p>참여 중인 진행 중 프로젝트가 없어요</p>
        </div>
      ) : (
        <ul className="dmp-list">
          {summaries.map((s) => (
            <li
              key={s.project.id}
              className="dmp-row"
              onClick={() => navigate(`/project?id=${encodeURIComponent(s.project.id)}`)}
            >
              <span
                className="dmp-dot"
                style={{ background: s.project.color || '#4361ee' }}
              />
              <span className="dmp-title">{s.project.title}</span>

              <span className="dmp-badges">
                {s.total === 0 ? (
                  <span className="dmp-badge dmp-badge-ok">
                    <i className="fa-solid fa-circle-check" /> 순항 중
                  </span>
                ) : (
                  <>
                    {s.overdue > 0 && (
                      <span className="dmp-badge dmp-badge-overdue" title="마감 지남">
                        지연 {s.overdue}
                      </span>
                    )}
                    {s.urgent > 0 && (
                      <span className="dmp-badge dmp-badge-urgent" title="긴급 우선순위">
                        긴급 {s.urgent}
                      </span>
                    )}
                    {s.noOwner > 0 && (
                      <span className="dmp-badge dmp-badge-noowner" title="담당자 미지정">
                        미할당 {s.noOwner}
                      </span>
                    )}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}