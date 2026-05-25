// components/project/ProjectEditModal.jsx
// 프로젝트 수정 모달 — 원본 #project-edit-modal + openProjectEditModal /
// updateProject / deleteProject 이관.
//
// 주의: 프로젝트 삭제는 영구 삭제(+태스크 함께 삭제). window.confirm 후에만 호출.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useProject } from '../../contexts/ProjectContext';
import { PROJECT_STATUS_OPTIONS } from '../../config/projectConfig';
import { useToast } from '../../contexts/ToastContext';

const EMPTY = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'in-progress',
  start_date: '',
  end_date: '',
};

export default function ProjectEditModal() {
  const toast = useToast();
  const { editModalTarget, closeEditModal, updateProject, deleteProject } =
    useProject();

  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const open = editModalTarget != null;

  useEffect(() => {
    if (open && editModalTarget) {
      setForm({
        title: editModalTarget.title || '',
        description: editModalTarget.description || '',
        priority: editModalTarget.priority || 'medium',
        status: editModalTarget.status || 'in-progress',
        start_date: editModalTarget.start_date || '',
        end_date: editModalTarget.end_date || '',
      });
    }
  }, [open, editModalTarget]);

  const patch = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.success('프로젝트명은 필수입니다.');
      return;
    }
    setSubmitting(true);
    const result = await updateProject(editModalTarget.id, form);
    setSubmitting(false);

    if (result.ok) {
      toast.success('수정되었습니다.');
      closeEditModal();
    } else {
      toast.error(`수정 실패: ${result.error || ''}`);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        '⚠️ 정말 이 프로젝트를 삭제하시겠습니까?\n\n' +
          '• 프로젝트에 속한 모든 태스크와 댓글이 함께 삭제됩니다.\n' +
          '• 이 작업은 되돌릴 수 없습니다.'
      )
    )
      return;

    setSubmitting(true);
    const result = await deleteProject(editModalTarget.id);
    setSubmitting(false);

    if (result.ok) {
      toast.success('프로젝트가 삭제되었습니다.');
      closeEditModal();
    } else {
      toast.error(`삭제 실패: ${result.error || ''}`);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeEditModal} size="md" title={null}>
      <div style={{ padding: 4 }}>
        <h2 className="pm-modal-title">프로젝트 수정</h2>

        <div className="pm-form">
          <label>프로젝트명</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => patch('title', e.target.value)}
          />

          <label>설명</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => patch('description', e.target.value)}
          />

          <div className="pm-form-row">
            <div>
              <label>우선순위</label>
              <select
                value={form.priority}
                onChange={(e) => patch('priority', e.target.value)}
              >
                <option value="low">🔵 낮음</option>
                <option value="medium">⚪ 보통</option>
                <option value="high">🟠 높음</option>
                <option value="urgent">🔴 긴급</option>
              </select>
            </div>
            <div>
              <label>상태</label>
              <select
                value={form.status}
                onChange={(e) => patch('status', e.target.value)}
              >
                {PROJECT_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pm-form-row">
            <div>
              <label>시작일</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => patch('start_date', e.target.value)}
              />
            </div>
            <div>
              <label>마감일</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => patch('end_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={handleDelete}
            disabled={submitting}
            style={{
              background: 'var(--danger)',
              color: '#fff',
              width: 'auto',
              padding: '10px 18px',
            }}
          >
            삭제
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-out"
              onClick={closeEditModal}
              disabled={submitting}
            >
              닫기
            </button>
            <button
              type="button"
              className="btn btn-in"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? '처리 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}