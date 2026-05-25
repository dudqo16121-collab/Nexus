// components/meeting/parts/ConvertToTasksModal.jsx
// 액션 아이템 → 칸반 카드 일괄 변환 모달.
// 대상 프로젝트 선택 + 미리보기 + 일괄 변환.

import { useState, useMemo } from 'react';
import Modal from '../../common/Modal';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useProject } from '../../../contexts/ProjectContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';

export default function ConvertToTasksModal({ isOpen, onClose, actions }) {
  const { user } = useAuth();
  const toast = useToast();
  const { current, convertActionsToTasks, refreshCurrent } = useMeetingCanvas();
  const { projects, myMemberProjectIds } = useProject();

  const [targetProjectId, setTargetProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* 내가 멤버이거나 owner 인 진행 중 프로젝트만 후보로 */
  const candidateProjects = useMemo(() => {
    return (projects || [])
      .filter((p) => p.status !== 'completed' && p.status !== 'archived')
      .filter((p) => p.owner_id === user?.id || myMemberProjectIds?.has?.(p.id))
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [projects, myMemberProjectIds, user?.id]);

  const targetProject = candidateProjects.find((p) => String(p.id) === String(targetProjectId));

  const handleConvert = async () => {
    if (!targetProjectId) {
      toast.warning('변환할 프로젝트를 선택해주세요');
      return;
    }
    if (!current?.canvas?.id) return;

    setSubmitting(true);
    const res = await convertActionsToTasks(current.canvas.id, Number(targetProjectId));
    setSubmitting(false);

    if (res.ok) {
      const n = res.converted?.length || 0;
      if (n === 0) {
        toast.info('변환할 새 액션이 없어요');
      } else {
        toast.success(`✅ ${n}개의 액션이 "${targetProject.title}" 프로젝트의 칸반 카드로 변환됐어요!`);
      }
      onClose();
    } else {
      toast.error(res.error || '변환 실패');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <>
          <i className="fa-solid fa-rocket" style={{ color: '#ec4899' }} />
          액션 → 칸반 카드 변환
        </>
      }
    >
      <div style={{ padding: 4 }}>
        <div className="mc-convert-info-banner">
          <i className="fa-solid fa-circle-info" />
          <div>
            <strong>변환되면 어떻게 되나요?</strong>
            <p>
              액션 아이템이 선택한 프로젝트의 <strong>"To Do"</strong> 컬럼에 칸반 카드로 추가됩니다.
              담당자와 마감일도 함께 옮겨져요. 회의 캔버스에는 "카드 연결됨" 배지가 표시됩니다.
            </p>
          </div>
        </div>

        {/* 변환될 액션 목록 미리보기 */}
        <div className="form-group">
          <label className="form-label">변환할 액션 ({actions?.length || 0}건)</label>
          <ul className="mc-convert-preview-list">
            {(actions || []).map((a, i) => (
              <li key={a.id} className="mc-convert-preview-item">
                <span className="mc-convert-preview-num">{i + 1}</span>
                <div className="mc-convert-preview-body">
                  <div className="mc-convert-preview-content">{a.content}</div>
                  <div className="mc-convert-preview-meta">
                    {a.owner_name && (
                      <span><i className="fa-solid fa-user" /> {a.owner_name}</span>
                    )}
                    {a.due_date && (
                      <span><i className="fa-regular fa-calendar" /> {a.due_date}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="form-group">
          <label className="form-label">
            <i className="fa-solid fa-diagram-project" /> 대상 프로젝트 *
          </label>
          {candidateProjects.length === 0 ? (
            <div className="mc-convert-no-project">
              참여 중인 활성 프로젝트가 없어요. 먼저 프로젝트에 참여하거나 만들어주세요.
            </div>
          ) : (
            <select
              className="form-input"
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
            >
              <option value="">프로젝트 선택...</option>
              {candidateProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {targetProject && (
          <div className="mc-convert-target-preview">
            <div
              className="mc-convert-target-dot"
              style={{ background: targetProject.color || '#4361ee' }}
            />
            <div>
              <strong>{targetProject.title}</strong>
              {targetProject.description && (
                <p>{targetProject.description}</p>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-out"
            onClick={onClose}
            disabled={submitting}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-in"
            onClick={handleConvert}
            disabled={submitting || !targetProjectId || candidateProjects.length === 0}
            style={{ background: '#ec4899' }}
          >
            {submitting ? (
              <><i className="fa-solid fa-spinner fa-spin" /> 변환 중...</>
            ) : (
              <><i className="fa-solid fa-rocket" /> {actions?.length || 0}건 변환하기</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}