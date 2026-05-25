// components/admin/EmployeeEditModal.jsx
// 직원 정보 편집 모달 — 풀 필드 (이름/부서/직급/연락처/입사일 등)

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../contexts/ToastContext';
import { useSystemLog } from '../../contexts/SystemLogContext';

export default function EmployeeEditModal({ user, onClose, onSaved }) {
  const toast = useToast();
  const { logEvent } = useSystemLog();
  const { updateUser } = useAdmin();

  const [form, setForm] = useState({
    full_name: '',
    department: '',
    position: '',
    phone: '',
    employee_no: '',
    hire_date: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        department: user.department || '',
        position: user.position || '',
        phone: user.phone || '',
        employee_no: user.employee_no || '',
        hire_date: user.hire_date || '',
      });
    }
  }, [user]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const patch = {
      full_name: form.full_name.trim() || null,
      department: form.department.trim() || null,
      position: form.position.trim() || null,
      phone: form.phone.trim() || null,
      employee_no: form.employee_no.trim() || null,
      hire_date: form.hire_date || null,
    };
    const res = await updateUser(user.id, patch);
    setSaving(false);
    if (res.ok) {
      toast.success('저장되었습니다.');
      logEvent('info', 'admin', `직원 정보 수정: ${form.full_name}`, {
        refType: 'profile',
        refId: user.id,
        meta: { patch },
      });
      onSaved?.(patch);
    } else {
      toast.error(res.error || '실패');
    }
  };

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      size="md"
      title={user ? `${user.full_name || '직원'} 정보 수정` : '직원 정보'}
    >
      {user && (
        <div className="emp-edit-body">
          {/* 아바타 + 이메일 (읽기 전용) */}
          <div className="emp-edit-header">
            <div
              className="avatar"
              style={{
                width: 64, height: 64,
                backgroundImage: `url('${user.avatar_url || 'https://i.pravatar.cc/150?u=' + user.id}')`,
              }}
            />
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>이메일</div>
              <div style={{ fontWeight: 600 }}>{user.email || '-'}</div>
            </div>
          </div>

          <div className="emp-edit-grid">
            <div className="emp-edit-field">
              <label>이름</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
              />
            </div>
            <div className="emp-edit-field">
              <label>사번</label>
              <input
                type="text"
                value={form.employee_no}
                onChange={(e) => set('employee_no', e.target.value)}
                placeholder="예: EMP-001"
              />
            </div>
            <div className="emp-edit-field">
              <label>부서</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
              />
            </div>
            <div className="emp-edit-field">
              <label>직급</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => set('position', e.target.value)}
                placeholder="예: 매니저, 사원"
              />
            </div>
            <div className="emp-edit-field">
              <label>연락처</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
<div className="emp-edit-field">
              <label>입사일</label>
              <input
                type="date"
                value={form.hire_date}
                onChange={(e) => set('hire_date', e.target.value)}
              />
            </div>
          </div>

          <div className="emp-edit-actions">
            <button className="btn-ghost" onClick={onClose} disabled={saving}>
              취소
            </button>
            <button className="btn btn-in" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><i className="fa-solid fa-spinner fa-spin" /> 저장 중...</>
              ) : (
                <><i className="fa-solid fa-floppy-disk" /> 저장</>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}