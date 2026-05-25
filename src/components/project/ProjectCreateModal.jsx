// components/project/ProjectCreateModal.jsx
// 새 프로젝트 생성 모달 — 원본 #project-create-modal + openProjectCreateModal /
// saveNewProject 이관. 공통 Modal 래퍼 사용.
//
// 채팅 채널 자동 생성 체크박스 포함 — payload.wantChannel 로 ProjectContext.createProject 에 전달.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import {
  PROJECT_COLORS,
  PROJECT_STATUS_OPTIONS,
} from '../../config/projectConfig';

const EMPTY = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'in-progress',
  color: '#4361ee',
  start_date: '',
  end_date: '',
  wantChannel: true, // 채널 자동 생성 — 기본 ON (원본과 동일)
};

export default function ProjectCreateModal() {
  const toast = useToast();
  const { createModalOpen, closeCreateModal, createProject } = useProject();

  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (createModalOpen) setForm(EMPTY);
  }, [createModalOpen]);

  const patch = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('프로젝트명을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const result = await createProject(form);
    setSubmitting(false);

    if (result.ok) {
      toast.success('프로젝트가 생성되었습니다.');
      closeCreateModal();
    } else {
      toast.error(`프로젝트 생성 실패: ${result.error || ''}`);
    }
  };

  return (
    <Modal
      isOpen={createModalOpen}
      onClose={closeCreateModal}
      size="sm"
      title="새 프로젝트"
    >
      <div className="pm-form">
        <label>
          프로젝트명 <span className="req">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => patch('title', e.target.value)}
          placeholder="예) 2026 상반기 모바일 앱 개편"
        />

        <label>설명</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => patch('description', e.target.value)}
          placeholder="목표, 범위 등 간단한 설명"
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
              {PROJECT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pm-form-row">
          <div>
            <label>컬러</label>
            <div className="pm-color-picker">
              {PROJECT_COLORS.map((c) => (
                <span
                  key={c}
                  className={form.color === c ? 'active' : ''}
                  data-color={c}
                  style={{ background: c, cursor: 'pointer' }}
                  onClick={() => patch('color', c)}
                />
              ))}
            </div>
          </div>
          <div />
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

        <label className="pm-check">
          <input
            type="checkbox"
            checked={form.wantChannel}
            onChange={(e) => patch('wantChannel', e.target.checked)}
          />
          <span>동일 이름의 메신저 채널 자동 생성</span>
        </label>
      </div>

      <div className="modal-buttons">
        <button
          type="button"
          className="btn btn-out"
          onClick={closeCreateModal}
          disabled={submitting}
        >
          취소
        </button>
        <button
          type="button"
          className="btn btn-in"
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? '생성 중...' : '생성하기'}
        </button>
      </div>
    </Modal>
  );
}