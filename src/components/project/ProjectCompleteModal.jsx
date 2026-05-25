// components/project/ProjectCompleteModal.jsx
// 프로젝트 완료 처리 + 첫 보고서 작성 모달.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import {
  REPORT_SECTIONS, emptyReport, buildSnapshot,
} from '../../config/projectReportConfig';

export default function ProjectCompleteModal() {
  const toast = useToast();
  const {
    completeModalTarget, closeCompleteModal, completeProject,
    tasks, openReportModal,
  } = useProject();

  const open = completeModalTarget != null;
  const project = completeModalTarget;

  const [form, setForm] = useState(emptyReport());
  const [members, setMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

useEffect(() => {
    if (!open || !project) return;
    setForm(emptyReport());
    (async () => {
      try {
        /* 1) project_members 에서 user_id 만 가져오기 */
        const { data: memberRows, error: e1 } = await supabase
          .from('project_members')
          .select('user_id')
          .eq('project_id', project.id);
        if (e1) throw e1;

        const userIds = (memberRows || []).map((m) => m.user_id).filter(Boolean);
        if (userIds.length === 0) {
          setMembers([]);
          return;
        }

        /* 2) 그 user_id 들로 profiles 조회 */
        const { data: profiles, error: e2 } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (e2) throw e2;

        const list = (profiles || []).map((p) => ({
          id: p.id,
          full_name: p.full_name || '익명',
        }));
        setMembers(list);
      } catch (e) {
        console.warn('[CompleteModal] member fetch:', e);
        setMembers([]);
      }
    })();
  }, [open, project]);

  const patch = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    /* 필수 필드 검증 */
    for (const sec of REPORT_SECTIONS) {
      if (sec.required && !form[sec.field]?.trim()) {
        toast.warning(`"${sec.label}" 항목은 필수예요`);
        return;
      }
    }

    if (!confirm(
      `"${project.title}" 프로젝트를 완료 처리할까요?\n\n` +
      `완료 후에도 보고서는 언제든 수정할 수 있어요.`
    )) return;

    setSubmitting(true);
    const snapshot = buildSnapshot(project, tasks, members);
    const res = await completeProject(project.id, form, snapshot);
    setSubmitting(false);

    if (res.ok) {
      toast.success('🎉 프로젝트가 완료됐어요! 멤버들에게 알림을 보냈습니다.');
      closeCompleteModal();
      /* 자동으로 보고서 모달 열어서 미리보기 */
      setTimeout(() => openReportModal(project), 300);
    } else {
      toast.error(res.error || '완료 처리 실패');
    }
  };

  const handleSkip = async () => {
    if (!confirm('보고서를 작성하지 않고 완료만 처리할까요?\n나중에 보고서를 추가할 수 있어요.')) return;
    setSubmitting(true);
    const snapshot = buildSnapshot(project, tasks, members);
    const res = await completeProject(project.id, emptyReport(), snapshot);
    setSubmitting(false);
    if (res.ok) {
      toast.success('프로젝트가 완료됐어요. 보고서는 나중에 작성하실 수 있어요.');
      closeCompleteModal();
    } else {
      toast.error(res.error);
    }
  };

  if (!project) return null;

  /* 통계 미리보기 */
  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const rate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  return (
    <Modal
      isOpen={open}
      onClose={closeCompleteModal}
      size="lg"
      title={
        <>
          <i className="fa-solid fa-flag-checkered" style={{ color: '#06d6a0' }} />
          프로젝트 완료 처리
        </>
      }
    >
      <div className="pc-modal-body">
        {/* 완료 미리보기 */}
        <div className="pc-preview-banner" style={{ borderColor: project.color }}>
          <div className="pc-preview-title">
            <span className="pc-color-dot" style={{ background: project.color }} />
            <strong>{project.title}</strong>
          </div>
          <div className="pc-preview-stats">
            <div><strong>{tasksTotal}</strong><span>전체 태스크</span></div>
            <div><strong>{tasksDone}</strong><span>완료 태스크</span></div>
            <div><strong>{rate}%</strong><span>완료율</span></div>
            <div><strong>{members.length}</strong><span>참여 인원</span></div>
          </div>
        </div>

        <div className="pc-info-banner">
          <i className="fa-solid fa-circle-info" />
          <div>
            <strong>완료 보고서를 작성해보세요.</strong>
            <p>
              이 보고서는 프로젝트의 자산으로 남아 다음 프로젝트에 도움이 됩니다.
              완료 후에도 언제든 수정할 수 있어요.
            </p>
          </div>
        </div>

        {/* 섹션 입력 */}
        {REPORT_SECTIONS.map((sec) => (
          <div key={sec.field} className="pc-section">
            <label className="pc-section-label">
              {sec.label}
              {sec.required && <span className="pc-required">*</span>}
            </label>
            <textarea
              className="pc-textarea"
              rows={sec.rows}
              placeholder={sec.placeholder}
              value={form[sec.field] || ''}
              onChange={(e) => patch(sec.field, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="pc-modal-foot">
        <button
          type="button"
          className="btn btn-out"
          onClick={closeCompleteModal}
          disabled={submitting}
        >
          취소
        </button>
        <button
          type="button"
          className="btn btn-out"
          onClick={handleSkip}
          disabled={submitting}
          title="나중에 보고서 작성하기"
        >
          보고서 없이 완료
        </button>
        <button
          type="button"
          className="btn btn-in"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ background: '#06d6a0' }}
        >
          {submitting ? (
            <><i className="fa-solid fa-spinner fa-spin" /> 처리 중...</>
          ) : (
            <><i className="fa-solid fa-flag-checkered" /> 완료 + 보고서 저장</>
          )}
        </button>
      </div>
    </Modal>
  );
}