import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useApproval, URGENCY_LEVELS } from '../../contexts/ApprovalContext';
import { FORM_META, FORM_ORDER } from '../../config/approvalForms';
import DynamicFields from './DynamicFields';
import ApproverLine from './ApproverLine';
import { useToast } from '../../contexts/ToastContext';
import BookmarkButton from '../common/BookmarkButton';

const EMPTY_FORM = {
  type: '',
  title: '',
  body: '',
  note: '',
  urgency: '일반',
  fields: {},
  approvers: [],
};

// initialType: 모달이 열릴 때 미리 선택할 결재 양식 (옵셔널).
//   - 미지정 시 기존 동작 그대로 (빈 폼).
//   - 근태 페이지의 "휴가 신청"에서 '연차신청서'를 넘겨 재사용한다.
// initialTitle: 모달이 열릴 때 제목 기본값 (옵셔널).
export default function ApprovalWriteModal({
  isOpen,
  onClose,
  onComplete,
  initialType = '',
  initialTitle = '',
}) {
  const toast = useToast();
  const { createApproval, fetchApproverOptions } = useApproval();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // 모달 열릴 때: 폼 초기화 + 결재자 목록 로드
  // initialType / initialTitle 이 주어지면 그 값으로 시작한다.
  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY_FORM,
        type: initialType || '',
        title: initialTitle || '',
      });
      fetchApproverOptions();
    }
  }, [isOpen, initialType, initialTitle, fetchApproverOptions]);

  // 양식 변경 시 동적 필드 값 초기화
  const handleTypeChange = (newType) => {
    setForm((prev) => ({ ...prev, type: newType, fields: {} }));
  };

  const handleField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDynamicField = (fieldId, value) => {
    setForm((prev) => ({
      ...prev,
      fields: { ...prev.fields, [fieldId]: value },
    }));
  };

  const handleAddApprover = (approver) => {
    setForm((prev) => ({ ...prev, approvers: [...prev.approvers, approver] }));
  };

  const handleRemoveApprover = (idx) => {
    setForm((prev) => ({
      ...prev,
      approvers: prev.approvers
        .filter((_, i) => i !== idx)
        .map((a, i) => ({ ...a, order: i })),
    }));
  };

  // 임시저장
  const handleSaveDraft = async () => {
    if (!form.title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const result = await createApproval({ ...form, status: 'draft' });
    setSubmitting(false);

    if (result) {
      toast.success('💾 임시저장 완료');
      onClose();
      onComplete?.();
    } else {
      toast.error('저장에 실패했습니다.');
    }
  };

  // 상신
  const handleSubmit = async () => {
    if (!form.type) {
      toast.warning('결재 양식을 선택해주세요.');
      return;
    }
    if (!form.title.trim()) {
      toast.warning('문서 제목을 입력해주세요.');
      return;
    }
    if (!form.body.trim()) {
      toast.warning('상세 내용을 입력해주세요.');
      return;
    }
    if (form.approvers.length === 0) {
      toast.warning('결재자를 1명 이상 추가하세요.');
      return;
    }

    setSubmitting(true);
    const result = await createApproval({ ...form, status: 'pending' });
    setSubmitting(false);

    if (result) {
      toast.success(
        `✅ 상신 완료!\n"${form.title}" 문서가 결재선에 등록되었습니다.\n${form.approvers[0].name}님께 결재 요청이 발송됩니다.`
      );
      onClose();
      onComplete?.();
    } else {
      toast.error('상신에 실패했습니다.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={null}>
      <div className="appr-write-modal">
        <div className="appr-write-header">
          <h2>
            <i className="fa-solid fa-pen-to-square"></i> 기안 작성
          </h2>
          <p>결재선을 지정하고 문서를 상신하세요.</p>
        </div>

<div className="appr-write-body">
          {/* 양식 + 긴급도 */}
          <div className="appr-form-row">
            <div className="appr-form-group" style={{ flex: 1 }}>
              <label
                className="appr-label"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>
                  결재 양식 <span className="appr-required">*</span>
                </span>
                {/* ⭐ 현재 선택된 양식 즐겨찾기 — 양식 선택 후에만 노출 */}
                {form.type && (
                  <BookmarkButton
                    kind="approval_form"
                    refId={form.type}
                    title={`${form.type} 작성`}
                    subtitle="결재 양식"
                    link={`/approval?form=${encodeURIComponent(form.type)}`}
                    size="sm"
                  />
                )}
              </label>
              <select
                className="appr-input"
                value={form.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="" disabled>
                  양식을 선택하세요
                </option>
                {FORM_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {FORM_META[t].emoji} {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="appr-form-group" style={{ flex: 1 }}>
              <label className="appr-label">긴급도</label>
              <select
                className="appr-input"
                value={form.urgency}
                onChange={(e) => handleField('urgency', e.target.value)}
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>
                    {u === '긴급' ? '🔴 긴급' : u === '보통' ? '🟡 보통' : '일반'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 제목 */}
          <div className="appr-form-group">
            <label className="appr-label">
              문서 제목 <span className="appr-required">*</span>
            </label>
            <input
              type="text"
              className="appr-input"
              placeholder="기안 제목을 입력하세요 (예: [지출결의] 4월 팀 회식 비용 청구의 건)"
              value={form.title}
              onChange={(e) => handleField('title', e.target.value)}
            />
          </div>

          {/* 양식별 동적 필드 */}
          <DynamicFields
            formType={form.type}
            values={form.fields}
            onChange={handleDynamicField}
          />

          {/* 본문 */}
          <div className="appr-form-group">
            <label className="appr-label">
              상세 내용 <span className="appr-required">*</span>
            </label>
            <textarea
              className="appr-input"
              rows={6}
              placeholder="상세 사유 및 내용을 입력하세요."
              value={form.body}
              onChange={(e) => handleField('body', e.target.value)}
            />
          </div>

          {/* 첨부 메모 */}
          <div className="appr-form-group">
            <label className="appr-label">
              첨부 메모 <span className="appr-optional">(선택)</span>
            </label>
            <input
              type="text"
              className="appr-input"
              placeholder="결재자에게 전달할 별도 메모"
              value={form.note}
              onChange={(e) => handleField('note', e.target.value)}
            />
          </div>

          {/* 결재선 */}
          <ApproverLine
            approvers={form.approvers}
            onAdd={handleAddApprover}
            onRemove={handleRemoveApprover}
          />

          {/* 버튼 */}
          <div className="appr-write-actions">
            <button
              type="button"
              className="btn btn-out"
              onClick={handleSaveDraft}
              disabled={submitting}
              style={{ flex: 1, height: 48 }}
            >
              <i className="fa-solid fa-floppy-disk"></i> 임시저장
            </button>
            <button
              type="button"
              className="btn btn-in"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ flex: 2, height: 48, fontSize: '1rem' }}
            >
              <i className="fa-solid fa-paper-plane"></i>{' '}
              {submitting ? '처리 중...' : '상신하기'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}