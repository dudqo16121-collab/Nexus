// 과정 생성/수정 모달 (관리자 전용).

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useTraining, CATEGORIES } from '../../contexts/TrainingContext';
import { useToast } from '../../contexts/ToastContext';

const EMPTY = {
  title: '',
  description: '',
  category: 'job',
  instructor: '',
  capacity: 20,
  start_date: '',
  end_date: '',
  location: '',
  status: 'open',
};

export default function TrainingEditorModal() {
  const { editorModal, closeEditor, createCourse, updateCourse } = useTraining();
  const toast = useToast();
  const { open, course } = editorModal;
  const isEdit = !!course;

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (course) {
      setForm({
        title: course.title || '',
        description: course.description || '',
        category: course.category || 'job',
        instructor: course.instructor || '',
        capacity: course.capacity || 20,
        start_date: course.start_date || '',
        end_date: course.end_date || '',
        location: course.location || '',
        status: course.status || 'open',
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, course]);

  const patch = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('과정명을 입력해주세요.');
      return;
    }
    setSaving(true);
    const res = isEdit
      ? await updateCourse(course.id, form)
      : await createCourse(form);
    setSaving(false);

    if (res.ok) {
      toast.success(isEdit ? '과정이 수정되었어요.' : '과정이 추가되었어요.');
      closeEditor();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeEditor} size="md" title={isEdit ? '과정 수정' : '새 과정 추가'}>
      <div className="pm-form">
        <label>과정명 <span className="req">*</span></label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => patch('title', e.target.value)}
          placeholder="예) 데이터 분석 입문 과정"
        />

        <label>설명</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => patch('description', e.target.value)}
          placeholder="과정 내용, 대상, 사전 지식 등"
        />

        <div className="pm-form-row">
          <div>
            <label>카테고리</label>
            <select value={form.category} onChange={(e) => patch('category', e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>상태</label>
            <select value={form.status} onChange={(e) => patch('status', e.target.value)}>
              <option value="open">모집 중</option>
              <option value="closed">마감</option>
              <option value="archived">보관</option>
            </select>
          </div>
        </div>

        <div className="pm-form-row">
          <div>
            <label>강사</label>
            <input
              type="text"
              value={form.instructor}
              onChange={(e) => patch('instructor', e.target.value)}
              placeholder="강사명 또는 회사"
            />
          </div>
          <div>
            <label>정원 (명)</label>
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => patch('capacity', e.target.value)}
            />
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
            <label>종료일</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => patch('end_date', e.target.value)}
            />
          </div>
        </div>

        <label>장소</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => patch('location', e.target.value)}
          placeholder="예) 본사 5층 대회의실 / 온라인 (Zoom)"
        />
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeEditor} disabled={saving}>
          취소
        </button>
        &nbsp;
        <button type="button" className="btn btn-in" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
        </button>
      </div>
    </Modal>
  );
}