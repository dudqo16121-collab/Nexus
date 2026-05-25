// components/modals/ProjectEditModal.jsx
// 원본 #project-edit-modal + openProjectEditModal + updateProject + deleteProject 의 React 이관.
//
// stand-alone. 부모는 project prop 으로 수정 대상을 넘겨주고,
// onUpdated(updates)/onDeleted(id) 콜백으로 결과를 받는다.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const toast = (msg, type = 'success') => {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    console.log(`[toast/${type}]`, msg);
  }
};

export default function ProjectEditModal({ isOpen, onClose, project, onUpdated, onDeleted }) {
  const { user } = useAuth();

  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus]     = useState('todo');
  const [startDate, setStart]   = useState('');
  const [endDate, setEnd]       = useState('');
  const [saving, setSaving]     = useState(false);

  /* 열릴 때마다 project 로 초기화 */
  useEffect(() => {
    if (!isOpen || !project) return;
    setTitle(project.title || '');
    setDesc(project.description || '');
    setPriority(project.priority || 'medium');
    setStatus(project.status || 'todo');
    setStart(project.start_date || '');
    setEnd(project.end_date || '');
  }, [isOpen, project]);

  const handleUpdate = async () => {
    const t = title.trim();
    if (!t) { toast('프로젝트명은 필수입니다.', 'warning'); return; }
    if (!project?.id) return;

    setSaving(true);
    const updates = {
      title: t,
      description: desc.trim(),
      priority,
      status,
      start_date: startDate || null,
      end_date:   endDate   || null,
    };

    try {
      if (user) {
        const { error } = await supabase.from('projects').update(updates).eq('id', project.id);
        if (error) throw error;
      }
      toast('수정되었습니다.');
      onUpdated?.({ ...project, ...updates });
      onClose();
    } catch (e) {
      console.error('[ProjectEdit] update error:', e);
      toast('수정 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project?.id) return;
    if (!window.confirm('정말 이 프로젝트를 삭제하시겠습니까? 모든 태스크가 함께 삭제됩니다.')) return;

    setSaving(true);
    try {
      if (user) {
        const { error } = await supabase.from('projects').delete().eq('id', project.id);
        if (error) throw error;
      }
      toast('프로젝트가 삭제되었습니다.');
      onDeleted?.(project.id);
      onClose();
    } catch (e) {
      console.error('[ProjectEdit] delete error:', e);
      toast('삭제 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="프로젝트 수정">
      <div className="pm-form">
        <label>프로젝트명</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label>설명</label>
        <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />

        <div className="pm-form-row">
          <div>
            <label>우선순위</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">🔵 낮음</option>
              <option value="medium">⚪ 보통</option>
              <option value="high">🟠 높음</option>
              <option value="urgent">🔴 긴급</option>
            </select>
          </div>
          <div>
            <label>상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todo">진행 예정</option>
              <option value="in-progress">진행 중</option>
              <option value="done">완료</option>
            </select>
          </div>
        </div>

        <div className="pm-form-row">
          <div>
            <label>시작일</label>
            <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label>마감일</label>
            <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="modal-buttons">
        <button
          className="btn"
          type="button"
          style={{ background: 'var(--danger)', color: 'white' }}
          onClick={handleDelete}
          disabled={saving}
        >
          삭제
        </button>
        <button
          className="btn btn-in"
          type="button"
          style={{ flex: 1 }}
          onClick={handleUpdate}
          disabled={saving}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        <button className="btn btn-out" type="button" onClick={onClose} disabled={saving}>
          닫기
        </button>
      </div>
    </Modal>
  );
}
