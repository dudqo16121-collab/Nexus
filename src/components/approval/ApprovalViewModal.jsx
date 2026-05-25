import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useApproval, getStatusInfo } from '../../contexts/ApprovalContext';
import { useAuth } from '../../contexts/AuthContext';
import { FIELD_LABELS, fmtDateTime } from '../../config/approvalForms';
import ApproverProgress from './ApproverProgress';
import { useToast } from '../../contexts/ToastContext';

export default function ApprovalViewModal({ docId, isOpen, onClose, onComplete }) {
  const toast = useToast();
  const { fetchApproval, processApproval, cancelApproval, adminDeleteApproval } =
    useApproval();
  const { user, profile } = useAuth();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  // 결과 모달
  const [result, setResult] = useState(null); // { icon, title, desc }

  // 문서 로드
  useEffect(() => {
    if (isOpen && docId) {
      setLoading(true);
      setComment('');
      setResult(null);
      fetchApproval(docId).then((data) => {
        setDoc(data);
        setLoading(false);
      });
    } else {
      setDoc(null);
    }
  }, [isOpen, docId, fetchApproval]);

  if (!isOpen) return null;

  const step = doc?.current_step || 0;
  const apvs = doc?.approvers || [];
  const uid = user?.id;

  // 권한 판단 (원본 로직)
  const isCurApvr =
    doc &&
    apvs[step]?.id === uid &&
    !['approved', 'rejected', 'canceled'].includes(doc.status);
  const isDrafter = doc && doc.drafter_id === uid;
  const canCancel = isDrafter && ['pending', 'draft'].includes(doc?.status);
  const isAdmin = profile?.is_admin === true;

  // 양식 필드 (값 있는 것만)
  const fieldEntries = doc
    ? Object.entries(doc.fields || {}).filter(([, v]) => v)
    : [];

  // 결재 의견 (처리했거나 코멘트 있는 것만)
  const commentedApvs = apvs.filter(
    (a) => a.status !== 'waiting' || a.comment
  );

  // 승인/반려 처리
const handleProcess = async (action) => {
  if (action === 'rejected') {
    if (!window.confirm('이 문서를 반려하시겠습니까?')) return;
  }
  setProcessing(true);
  const res = await processApproval(docId, action, comment);
  setProcessing(false);

  if (res.ok) {
    setResult(res.message);

    /* 🔗 자동 연동이 일어났다면 추가 토스트 — 결재자에게도 알림 */
    if (res.linkageResult?.message) {
      toast.info(`자동 연동: ${res.linkageResult.message}`);
    }
  } else {
    toast.error(res.error || '처리에 실패했습니다.');
  }
};

  // 기안 취소
  const handleCancel = async () => {
    if (
      !window.confirm(
        '이 기안을 취소하시겠습니까?\n취소 후에는 복구할 수 없습니다.'
      )
    )
      return;
    setProcessing(true);
    const ok = await cancelApproval(docId);
    setProcessing(false);

    if (ok) {
      setResult({
        icon: '🚫',
        title: '기안 취소 완료',
        desc: '기안이 취소되었습니다.',
      });
    } else {
      toast.error('취소에 실패했습니다.');
    }
  };

  // 관리자 삭제
  const handleAdminDelete = async () => {
    if (
      !window.confirm(
        '관리자 권한으로 이 기안서를 완전히 삭제합니다.\n삭제된 문서는 복구할 수 없습니다.'
      )
    )
      return;
    setProcessing(true);
    const res = await adminDeleteApproval(docId);
    setProcessing(false);

    if (res.ok) {
      // 삭제는 결과 모달 없이 바로 닫기
      onClose();
      onComplete?.();
    } else {
      toast.success(res.error || '삭제에 실패했습니다.');
    }
  };

  // 결과 모달 확인 → 전체 닫기 + 목록 갱신
  const handleResultConfirm = () => {
    setResult(null);
    onClose();
    onComplete?.();
  };

  // ===== 결과 모달이 떠 있으면 그것만 표시 =====
  if (result) {
    return (
      <Modal isOpen={true} onClose={handleResultConfirm} size="sm" title={null}>
        <div className="appr-result-modal">
          <div className="appr-result-icon">{result.icon}</div>
          <h2 className="appr-result-title">{result.title}</h2>
          <p className="appr-result-desc">{result.desc}</p>
          <button
            className="btn btn-in"
            style={{ width: '100%', height: 46 }}
            onClick={handleResultConfirm}
          >
            확인
          </button>
        </div>
      </Modal>
    );
  }

  // ===== 메인 상세 모달 =====
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={null}>
      {loading || !doc ? (
        <div className="appr-empty">
          <i className="fa-solid fa-spinner fa-spin"></i> 불러오는 중...
        </div>
      ) : (
        <div className="appr-view-modal">
          {/* 헤더 */}
          <div className="appr-view-header">
            <div className="appr-view-header-left">
              <span className="appr-type-badge">{doc.type || '기안문'}</span>
              <div>
                <h2 className="appr-view-title">{doc.title || '(제목 없음)'}</h2>
                <p className="appr-view-meta">
                  {doc.doc_number} · 기안: {doc.drafter_name} ({doc.drafter_dept})
                  · {fmtDateTime(doc.created_at)}
                </p>
              </div>
            </div>
            {(() => {
              const si = getStatusInfo(doc.status, step, apvs.length);
              return (
                <span className={`status-badge ${si.cls}`}>{si.label}</span>
              );
            })()}
          </div>

          <div className="appr-view-body">
            {/* 결재선 진행 현황 */}
            <div className="appr-view-section">
              <p className="appr-view-section-label">결재선 진행 현황</p>
              <ApproverProgress
                approvers={apvs}
                currentStep={step}
                docStatus={doc.status}
              />
            </div>

            {/* 문서 정보 그리드 */}
            <div className="appr-view-fields">
              <div className="appr-field-cell">
                <span className="appr-field-key">긴급도</span>
                <p className="appr-field-val">{doc.urgency || '일반'}</p>
              </div>
              <div className="appr-field-cell">
                <span className="appr-field-key">기안부서</span>
                <p className="appr-field-val">{doc.drafter_dept || '-'}</p>
              </div>
              {fieldEntries.map(([k, v]) => (
                <div key={k} className="appr-field-cell">
                  <span className="appr-field-key">{FIELD_LABELS[k] || k}</span>
                  <p className="appr-field-val">{v}</p>
                </div>
              ))}
            </div>

            {/* 본문 */}
            <div className="appr-view-section">
              <p className="appr-view-section-label">상세 내용</p>
              <div className="appr-view-content">{doc.body || ''}</div>
            </div>

            {/* 첨부 메모 */}
            {doc.note && (
              <div className="appr-view-section">
                <p className="appr-view-section-label">첨부 메모</p>
                <div className="appr-view-note">{doc.note}</div>
              </div>
            )}

            {/* 결재 의견 */}
            <div className="appr-view-section">
              <p className="appr-view-section-label">결재 의견</p>
              {commentedApvs.length === 0 ? (
                <p className="appr-comment-empty">아직 결재 의견이 없습니다.</p>
              ) : (
                <div className="appr-comment-list">
                  {commentedApvs.map((a, i) => {
                    const icon =
                      a.status === 'approved'
                        ? '✅'
                        : a.status === 'rejected'
                        ? '❌'
                        : '⏳';
                    const label =
                      a.status === 'approved'
                        ? '승인'
                        : a.status === 'rejected'
                        ? '반려'
                        : '처리 전';
                    return (
                      <div
                        key={a.id || i}
                        className={`appr-comment-card ${a.status}`}
                      >
                        <div className="appr-comment-avatar">
                          {(a.name || '?').slice(0, 1)}
                        </div>
                        <div className="appr-comment-body">
                          <p className="appr-comment-meta">
                            <strong>{a.name}</strong> · {a.dept} · {icon} {label}
                            {a.acted_at ? ` · ${fmtDateTime(a.acted_at)}` : ''}
                          </p>
                          <p className="appr-comment-text">
                            {a.comment || (
                              <span className="appr-comment-none">의견 없음</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 결재 액션 (내가 현재 결재자) */}
            {isCurApvr && (
              <div className="appr-action-area">
                <p className="appr-action-title">
                  <i className="fa-solid fa-signature"></i> 결재 처리
                </p>
                <textarea
                  className="appr-input"
                  rows={3}
                  placeholder="결재 의견을 입력하세요 (선택사항)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="appr-action-buttons">
                  <button
                    className="btn appr-reject-btn"
                    onClick={() => handleProcess('rejected')}
                    disabled={processing}
                  >
                    <i className="fa-solid fa-xmark"></i> 반려
                  </button>
                  <button
                    className="btn btn-in"
                    style={{ flex: 2, height: 46, fontSize: '1rem' }}
                    onClick={() => handleProcess('approved')}
                    disabled={processing}
                  >
                    <i className="fa-solid fa-check"></i> 승인
                  </button>
                </div>
              </div>
            )}

            {/* 기안자 취소 */}
            {canCancel && (
              <div className="appr-cancel-area">
                <button
                  className="btn btn-out appr-cancel-btn"
                  onClick={handleCancel}
                  disabled={processing}
                >
                  <i className="fa-solid fa-ban"></i> 기안 취소
                </button>
              </div>
            )}

            {/* 관리자 삭제 */}
            {isAdmin && (
              <div className="appr-admin-delete-area">
                <button
                  className="appr-admin-delete-btn"
                  onClick={handleAdminDelete}
                  disabled={processing}
                >
                  <i className="fa-solid fa-trash-can"></i> 관리자 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}