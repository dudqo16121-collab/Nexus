// components/project/ProjectHeader.jsx
// 우측 메인 상단의 선택된 프로젝트 상세 헤더.
// 원본 renderProjectHeader / renderEmptyHeader 이관.
// 4단계: 채널 버튼 + 멤버 버튼 활성화.

import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import { PRIORITY_META } from '../../config/projectConfig';
import { ddayText, ddayClass } from '../../utils/projectHelpers';
import { isCompletedProject } from '../../config/projectConfig';

const toast = (msg, type = 'success') => {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    console.log(`[toast/${type}]`, msg);
  }
};

export default function ProjectHeader() {
  const {
    selectedProject: p,
    tasks,
    openEditModal,
    openMembersModal,
    openProjectChannel,
    openCompleteModal,
    openReportModal,
  } = useProject();
  const toast = useToast();

  if (!p) {
    return (
      <div className="pm-project-header">
        <div className="pm-ph-empty">
          <i className="fa-solid fa-hand-pointer" />
          <p>
            왼쪽에서 프로젝트를 선택하거나, 새 프로젝트를 만들어 시작하세요.
          </p>
        </div>
      </div>
    );
  }

  const pri = PRIORITY_META[p.priority] || {};
  const dday = ddayText(p.end_date);
  const ddayCls = ddayClass(p.end_date);

  /* 채널 열기 — 채널 없으면 비활성 */
  const hasChannel = !!p.channel_id;
  const handleOpenChannel = () => {
    const res = openProjectChannel(p.id);
    if (!res.ok) {
      toast.warning(res.error || '채널을 열 수 없습니다.');
      return;
    }
    if (res.fallback) {
      toast.info(`채널 #${res.channelName} 로 이동합니다.`);
    }
  };

  return (
    <div className="pm-project-header">
      <div className="pm-ph-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="pm-ph-title">
            <span
              className="pm-ph-color"
              style={{ background: p.color || '#4361ee' }}
            />
            {p.title}
          </h2>
          {p.description && <p className="pm-ph-desc">{p.description}</p>}
          <div className="pm-ph-meta">
            <span>
              <i className="fa-solid fa-fire" /> {pri.icon || ''}{' '}
              <strong>{pri.label || '-'}</strong>
            </span>
            <span>
              <i className="fa-regular fa-calendar" /> 마감{' '}
              <strong>{p.end_date || '미정'}</strong>
            </span>
            <span
              style={
                ddayCls === 'overdue'
                  ? { color: 'var(--danger)', fontWeight: 700 }
                  : undefined
              }
            >
              <i className="fa-regular fa-clock" /> {dday}
            </span>
            <span>
              <i className="fa-solid fa-list-check" /> 태스크{' '}
              <strong>{tasks.length}</strong>개
            </span>
            {isCompletedProject(p) && (
  <span style={{ color: '#06d6a0', fontWeight: 700 }}>
    <i className="fa-solid fa-circle-check" />  완료됨
    {p.completed_at && (
      <strong style={{ marginLeft: 6, fontWeight: 400, color: 'var(--text-muted)' }}>
        ({new Date(p.completed_at).toLocaleDateString('ko-KR')})
      </strong>
    )}
  </span>
)}
          </div>
        </div>

        <div className="pm-ph-actions">
          <button
            type="button"
            className="pm-icon-btn"
            disabled={!hasChannel}
            onClick={handleOpenChannel}
            title={hasChannel ? '프로젝트 채널 열기' : '연결된 채널 없음'}
            style={hasChannel ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
          >
            <i className="fa-regular fa-comment-dots" />
          </button>
          <button
            type="button"
            className="pm-icon-btn"
            onClick={openMembersModal}
            title="멤버 관리"
          >
            <i className="fa-solid fa-users" />
          </button>

          {/* ✨ 완료 / 보고서 버튼 */}
          {isCompletedProject(p) ? (
            <button
              type="button"
              className="pm-icon-btn"
              onClick={() => openReportModal(p)}
              title="완료 보고서 보기"
              style={{ color: p.color || '#4361ee' }}
            >
              <i className="fa-solid fa-file-lines" />
            </button>
          ) : (
            <button
              type="button"
              className="pm-icon-btn"
              onClick={() => openCompleteModal(p)}
              title="프로젝트 완료 처리"
              style={{ color: '#06d6a0' }}
            >
              <i className="fa-solid fa-flag-checkered" />
            </button>
          )}

          <button
            type="button"
            className="pm-icon-btn"
            onClick={() => openEditModal(p)}
            title="프로젝트 수정"
          >
            <i className="fa-solid fa-pen" />
          </button>
        </div>
      </div>
    </div>
  );
}