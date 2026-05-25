// 미션 생성/수정 (관리자 전용).

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useHub } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

const ICONS = [
  'fa-bullseye', 'fa-trophy', 'fa-rocket', 'fa-fire', 'fa-bolt',
  'fa-mug-hot', 'fa-dumbbell', 'fa-book', 'fa-handshake', 'fa-seedling',
];

const EMPTY = {
  title: '',
  description: '',
  icon: 'fa-bullseye',
  points: 50,
  start_date: '',
  end_date: '',
  status: 'active',
};

export default function HubMissionEditorModal() {
  const { missionEditorModal, closeMissionEditor, createMission, updateMission, deleteMission } = useHub();
  const toast = useToast();
  const { open, mission } = missionEditorModal;
  const isEdit = !!mission;

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mission) {
      setForm({
        title: mission.title || '',
        description: mission.description || '',
        icon: mission.icon || 'fa-bullseye',
        points: mission.points || 50,
        start_date: mission.start_date || '',
        end_date: mission.end_date || '',
        status: mission.status || 'active',
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, mission]);

  const patch = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('미션 제목을 입력해주세요.');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      points: parseInt(form.points, 10) || 50,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    const res = isEdit
      ? await updateMission(mission.id, payload)
      : await createMission(payload);
    setSaving(false);
    if (res.ok) {
      toast.success(isEdit ? '미션이 수정되었어요.' : '미션을 추가했어요.');
      closeMissionEditor();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 미션을 삭제하시겠습니까? 참여 내역도 함께 삭제됩니다.')) return;
    const res = await deleteMission(mission.id);
    if (res.ok) {
      toast.success('미션이 삭제되었어요.');
      closeMissionEditor();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeMissionEditor} size="sm" title={isEdit ? '미션 수정' : '새 미션'}>
      <div className="pm-form">
        <label>제목 <span className="req">*</span></label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => patch('title', e.target.value)}
          placeholder="예) 한 달에 책 한 권 읽기"
        />

        <label>설명</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => patch('description', e.target.value)}
          placeholder="미션에 대한 자세한 설명"
        />

        <label>아이콘</label>
        <div className="hub-icon-picker">
          {ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              className={`hub-icon-option ${form.icon === ic ? 'active' : ''}`}
              onClick={() => patch('icon', ic)}
            >
              <i className={`fa-solid ${ic}`} />
            </button>
          ))}
        </div>

        <div className="pm-form-row">
          <div>
            <label>완료 시 포인트</label>
            <input
              type="number"
              min="0"
              value={form.points}
              onChange={(e) => patch('points', e.target.value)}
            />
          </div>
          <div>
            <label>상태</label>
            <select value={form.status} onChange={(e) => patch('status', e.target.value)}>
              <option value="active">진행 중</option>
              <option value="closed">종료</option>
            </select>
          </div>
        </div>

        <div className="pm-form-row">
          <div>
            <label>시작일</label>
            <input type="date" value={form.start_date} onChange={(e) => patch('start_date', e.target.value)} />
          </div>
          <div>
            <label>마감일</label>
            <input type="date" value={form.end_date} onChange={(e) => patch('end_date', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="modal-buttons">
        {isEdit && (
          <button type="button" className="btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={handleDelete}>
            삭제
          </button>
        )}
        <button type="button" className="btn btn-out" onClick={closeMissionEditor} disabled={saving}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
        </button>
      </div>
    </Modal>
  );
}