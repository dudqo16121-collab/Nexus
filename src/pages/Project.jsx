// pages/Project.jsx
// 프로젝트 관리 메인 페이지.
// 원본 index.html <section id="view-project"> 를 React 로 이관.
//
// 4단계 (현재): 채팅 채널 / 멤버 초대 / 대시보드 위젯 ?id= 수신 연동.

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import ProjectSidebar from '../components/project/ProjectSidebar';
import ProjectHeader from '../components/project/ProjectHeader';
import ProjectCreateModal from '../components/project/ProjectCreateModal';
import ProjectEditModal from '../components/project/ProjectEditModal';
import ProjectMembersModal from '../components/project/ProjectMembersModal';
import KanbanBoard from '../components/project/KanbanBoard';
import TaskDetailPanel from '../components/project/TaskDetailPanel';
import ProjectCompleteModal from '../components/project/ProjectCompleteModal';
import ProjectReportModal from '../components/project/ProjectReportModal';

export default function Project() {
  const {
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
    projects,
    loading,
    openCreateModal,
    openMembersModal,
  } = useProject();

  /* ── 대시보드 위젯에서 ?id=xxx 로 들어온 경우 해당 프로젝트 선택 ──
     projects 가 로드된 뒤에만 동작 (그래야 유효 ID 인지 검증 가능) */
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get('id');

  useEffect(() => {
    if (loading) return;
    if (!queryId) return;
    if (queryId === selectedProjectId) return;
    const exists = projects.some((p) => p.id === queryId);
    if (exists) {
      setSelectedProjectId(queryId);
    }
    // 쿼리는 1회 소비 후 제거 — 새로고침 시 다시 트리거되지 않도록
    const next = new URLSearchParams(searchParams);
    next.delete('id');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, queryId, projects]);

  return (
    <section id="view-project">
      {/* ===== 상단 헤더 ===== */}
      <header
        className="pm-page-header"
        style={{
          background: 'transparent',
          backdropFilter: 'none',
          position: 'relative',
          marginBottom: 20,
        }}
      >
        <div
          className="pm-page-header-title"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            flexWrap: 'wrap',
            minWidth: 0,
          }}
        >
          <h2
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <i
              className="fa-solid fa-diagram-project"
              style={{ color: 'var(--primary-color)', marginRight: 10 }}
            />
            프로젝트 관리
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            프로젝트와 태스크의 진행 현황을 한눈에 파악하세요.
          </span>
        </div>

        <div
          className="pm-page-header-actions"
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexShrink: 0,
            flexWrap: 'nowrap',
          }}
        >
          {/* 멤버 초대 — 프로젝트 선택된 경우에만 활성 */}
          <button
            type="button"
            className="btn btn-out"
            style={{
              height: 42,
              padding: '0 16px',
              whiteSpace: 'nowrap',
              opacity: selectedProject ? 1 : 0.5,
              cursor: selectedProject ? 'pointer' : 'not-allowed',
            }}
            disabled={!selectedProject}
            onClick={openMembersModal}
            title={selectedProject ? '멤버 초대' : '프로젝트를 먼저 선택하세요'}
          >
            <i className="fa-solid fa-user-plus" /> 멤버 초대
          </button>
          <button
            type="button"
            className="btn btn-in"
            style={{ height: 42, padding: '0 16px', whiteSpace: 'nowrap' }}
            onClick={openCreateModal}
          >
            <i className="fa-solid fa-plus" /> 새 프로젝트
          </button>
        </div>
      </header>

      {/* ===== 2-패널 레이아웃 ===== */}
      <div className="pm-layout">
        <ProjectSidebar />

        <main className="pm-main">
          <ProjectHeader />
          {selectedProject && <KanbanBoard />}
        </main>
      </div>

      {/* 모달 + 슬라이드 패널 — 항상 마운트, 내부에서 표시 제어 */}
      <ProjectCreateModal />
      <ProjectEditModal />
      <ProjectMembersModal />
      <ProjectCompleteModal />
      <ProjectReportModal />
      <TaskDetailPanel />
    </section>
  );
}