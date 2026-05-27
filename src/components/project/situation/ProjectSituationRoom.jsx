// src/components/project/situation/ProjectSituationRoom.jsx
// 프로젝트 상황실 — 선택된 프로젝트 1개에 대한 종합 대시보드.
//
// 위젯 구성:
//   1. KPI Strip       — 진행률 / 태스크 / 멤버 / D-Day
//   2. Status Chart    — 칸반 컬럼별 카드 분포
//   3. Risk Panel      — 지연 / 미할당 / 마감임박 카드 리스트
//   4. Workload Panel  — 담당자별 할당 카드 수 + 진행률
//   5. Upcoming Panel  — D-7 이내 마감 임박 카드
//
// 데이터: ProjectContext.tasks (현재 selectedProject 의 태스크) + project_members.
// 무거운 추가 fetch 없음 — 이미 ProjectContext 가 들고 있는 데이터로 충분.

import { useState, useEffect } from 'react';
import { useProject } from '../../../contexts/ProjectContext';
import SituationKPI from './SituationKPI';
import SituationStatusChart from './SituationStatusChart';
import SituationRisks from './SituationRisks';
import SituationWorkload from './SituationWorkload';
import SituationUpcoming from './SituationUpcoming';

export default function ProjectSituationRoom() {
  const { selectedProject, selectedProjectId, tasks, fetchProjectMembers } = useProject();

  const [collapsed, setCollapsed] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  /* 멤버 로드 — 프로젝트 바뀔 때마다 */
  useEffect(() => {
    if (!selectedProjectId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    setMembersLoading(true);
    fetchProjectMembers(selectedProjectId).then((data) => {
      if (!cancelled) {
        setMembers(data || []);
        setMembersLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedProjectId, fetchProjectMembers]);

  if (!selectedProject) return null;

  /* 이 프로젝트의 태스크만 (ProjectContext.tasks 는 현재 프로젝트 기준) */
  const projectTasks = tasks || [];

  return (
    <section className="psr-room">
      {/* 헤더 — 토글 */}
      <button
        type="button"
        className="psr-toggle"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? '상황실 펼치기' : '상황실 접기'}
      >
        <span className="psr-toggle-label">
          <i className="fa-solid fa-radar" style={{ color: selectedProject.color || '#4361ee' }} />
          프로젝트 상황실
          <span className="psr-toggle-count">{projectTasks.length}개 태스크 분석</span>
        </span>
        <i className={`fa-solid fa-chevron-down psr-toggle-chev ${collapsed ? '' : 'rotated'}`} />
      </button>

      {!collapsed && (
        <div className="psr-grid">
          {/* 1행: KPI 4칸 */}
          <div className="psr-cell psr-cell-kpi">
            <SituationKPI
              project={selectedProject}
              tasks={projectTasks}
              members={members}
            />
          </div>

          {/* 2행: 좌(차트) / 우(위험신호) */}
          <div className="psr-cell psr-cell-chart">
            <SituationStatusChart tasks={projectTasks} />
          </div>
          <div className="psr-cell psr-cell-risk">
            <SituationRisks tasks={projectTasks} />
          </div>

          {/* 3행: 좌(워크로드) / 우(다가오는 마감) */}
          <div className="psr-cell psr-cell-workload">
            <SituationWorkload
              tasks={projectTasks}
              members={members}
              loading={membersLoading}
            />
          </div>
          <div className="psr-cell psr-cell-upcoming">
            <SituationUpcoming tasks={projectTasks} />
          </div>
        </div>
      )}
    </section>
  );
}