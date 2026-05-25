import { useApproval } from '../../contexts/ApprovalContext';
import { useToast } from '../../contexts/ToastContext';

export default function ApproverLine({ approvers, onAdd, onRemove }) {
  const toast = useToast();
  const { approverOptions } = useApproval();

  const handleAddClick = (e) => {
    const select = e.target.form
      ? null
      : document.getElementById('appr-approver-select');
    // form 없이 직접 select 참조
    const sel = document.getElementById('appr-approver-select');
    const id = sel?.value;
    if (!id) {
      toast.warning('결재자를 선택하세요.');
      return;
    }
    if (approvers.find((a) => a.id === id)) {
      toast.warning('이미 추가된 결재자입니다.');
      return;
    }
    const profile = approverOptions.find((p) => p.id === id);
    if (!profile) return;

    onAdd({
      id: profile.id,
      name: profile.full_name || '',
      dept: profile.department || '',
      order: approvers.length,
      status: 'waiting',
      comment: '',
      acted_at: null,
    });
    sel.value = '';
  };

  return (
    <div className="appr-form-group">
      <label className="appr-label">
        <i
          className="fa-solid fa-users"
          style={{ marginRight: 5, color: 'var(--primary-color)' }}
        ></i>
        결재선 지정 <span className="appr-required">*</span>
      </label>

      <div className="appr-approver-add-row">
        <select id="appr-approver-select" className="appr-input">
          <option value="">
            {approverOptions.length === 0
              ? '등록된 관리자가 없습니다'
              : '결재자(관리자)를 선택하세요...'}
          </option>
          {approverOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name || '이름없음'}
              {p.rank ? ` (${p.rank})` : ''} — {p.department || '-'}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-out appr-approver-add-btn"
          onClick={handleAddClick}
        >
          <i className="fa-solid fa-plus"></i> 추가
        </button>
      </div>

      <div className="appr-line-preview">
        {approvers.length === 0 ? (
          <p className="appr-line-empty">
            결재자를 추가하면 결재선이 표시됩니다.
          </p>
        ) : (
          approvers.map((a, i) => (
            <div key={a.id} className="appr-line-step">
              <div className="appr-step-card">
                <span className="step-order">{i + 1}차 결재</span>
                <span className="step-name">{a.name}</span>
                <span className="step-dept">{a.dept}</span>
                <span
                  className="step-remove"
                  onClick={() => onRemove(i)}
                  title="제거"
                >
                  ✕
                </span>
              </div>
              {i < approvers.length - 1 && (
                <span className="appr-step-arrow">→</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}