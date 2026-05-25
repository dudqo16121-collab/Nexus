// components/admin/AdminUserEditModal.jsx
// 사용자 정보 수정 모달 — 원본 #admin-user-edit-modal +
// openAdminUserEditModal / saveAdminUserEdit 이관.
// 이름/부서만 수정 (원본과 동일 — 권한 변경은 다루지 않음).

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../contexts/ToastContext';

export default function AdminUserEditModal() {
  const toast = useToast();
  const { userEditModal, closeUserEdit, saveUserEdit } = useAdmin();
  const { open, target } = userEditModal;

  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* 모달 열릴 때 대상 사용자 정보로 초기화 */
  useEffect(() => {
    if (open && target) {
      setName(target.full_name || '');
      setDept(target.department || '');
    }
  }, [open, target]);

  const handleSave = async () => {
    setSubmitting(true);
    const result = await saveUserEdit(target.id, {
      full_name: name,
      department: dept,
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success('사용자 정보가 성공적으로 수정되었습니다.');
      closeUserEdit();
    } else {
      toast.error(`${result.error || '수정에 실패했습니다.'}`);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: 14,
    borderRadius: 10,
    border: '1px solid var(--border-color)',
    marginTop: 5,
    fontSize: '1rem',
    outline: 'none',
    background: 'var(--input-bg)',
    color: 'var(--text-main)',
  };
  const labelStyle = {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  };

  return (
    <Modal isOpen={open} onClose={closeUserEdit} size="sm" title={null}>
      <div style={{ padding: 4 }}>
        <h2
          style={{
            marginBottom: 20,
            textAlign: 'center',
            fontSize: '1.3rem',
          }}
        >
          사용자 정보 수정
        </h2>

        <div style={{ marginBottom: 15 }}>
          <label style={labelStyle}>이름</label>
          <input
            type="text"
            placeholder="이름을 입력하세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 25 }}>
          <label style={labelStyle}>부서/직급</label>
          <input
            type="text"
            placeholder="예: 전략기획팀 대리"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-out"
            onClick={closeUserEdit}
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
            {submitting ? '처리 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </Modal>
  );
}