// 결재 상세 모달 (3단계 + 4단계 통합)
// 타임라인 / 첨부 / 의견 스레드 / 추천의견 / 이전·다음 / 인쇄
// + 빠른 결재 모드 + 키보드 단축키

import { useEffect, useState, useRef } from 'react';
import Modal from '../common/Modal';
import { useApproval, getStatusInfo } from '../../contexts/ApprovalContext';
import { useAuth } from '../../contexts/AuthContext';
import { FIELD_LABELS, fmtDateTime } from '../../config/approvalForms';
import { useToast } from '../../contexts/ToastContext';
import ContextWidget from '../common/ContextWidget';

/* 추천 의견 — 자주 쓰는 문구 */
const QUICK_COMMENTS = {
  approved: [
    '확인했습니다',
    '동의합니다',
    '잘 진행해주세요',
    '검토 완료, 승인합니다',
  ],
  rejected: [
    '내용을 다시 검토해주세요',
    '추가 자료가 필요합니다',
    '재상신 부탁드립니다',
  ],
};

/* 본문에서 첨부파일 감지 (메일함과 동일 패턴) */
function detectAttachments(body) {
  if (!body) return [];
  const matches = body.match(/첨부[^.\n]*?[:：]\s*([^\n]+)/gi);
  if (!matches) return [];
  const files = [];
  matches.forEach((m) => {
    const after = m.split(/[:：]/)[1] || '';
    after.split(/[,，\s]+/).forEach((name) => {
      const n = name.trim().replace(/[()]/g, '');
      if (n && /\.[a-z0-9]{2,5}$/i.test(n)) {
        files.push({ name: n, size: Math.floor(Math.random() * 500 + 50) });
      }
    });
  });
  return files;
}

function getFileIcon(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['pdf'].includes(ext)) return { icon: 'fa-file-pdf', color: '#f72585' };
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: '#06d6a0' };
  if (['docx', 'doc'].includes(ext)) return { icon: 'fa-file-word', color: '#4361ee' };
  if (['pptx', 'ppt'].includes(ext)) return { icon: 'fa-file-powerpoint', color: '#ff9f1c' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { icon: 'fa-file-image', color: '#8338ec' };
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: 'fa-file-zipper', color: '#94a3b8' };
  return { icon: 'fa-file', color: '#64748b' };
}

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

export default function ApprovalViewModal({ docId, isOpen, onClose, onComplete }) {
  const toast = useToast();
  const {
    fetchApproval,
    processApproval,
    cancelApproval,
    adminDeleteApproval,
    getAdjacentDocId,
    /* 빠른 모드 */
    powerModeActive,
    powerModeProcessed,
    myPendingDocIds,
    incrementPowerModeProcessed,
    exitPowerMode,
  } = useApproval();
  const { user, profile } = useAuth();

  /* 상태 */
  const [currentDocId, setCurrentDocId] = useState(docId);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [actionMode, setActionMode] = useState(null);

  /* 외부 docId 동기화 */
  useEffect(() => {
    if (isOpen) setCurrentDocId(docId);
  }, [isOpen, docId]);

  /* 문서 로드 */
  useEffect(() => {
    if (isOpen && currentDocId) {
      setLoading(true);
      setComment('');
      setResult(null);
      setActionMode(null);
      fetchApproval(currentDocId).then((data) => {
        setDoc(data);
        setLoading(false);
      });
    } else {
      setDoc(null);
    }
  }, [isOpen, currentDocId, fetchApproval]);

  /* 처리 함수 — useEffect 의존성 회피를 위해 ref 사용 */
  const handleProcessRef = useRef(null);

  /* ⭐ 단축키 (4단계) — early return 앞에 두고 useEffect 안에서 직접 계산 */
  useEffect(() => {
    if (!isOpen || !doc || processing || result) return;

    /* 파생 변수 — useEffect 안에서 직접 계산 (TDZ 회피) */
    const step = doc.current_step || 0;
    const apvs = doc.approvers || [];
    const myTurn =
      apvs[step]?.id === user?.id &&
      !['approved', 'rejected', 'canceled'].includes(doc.status);
    const nextDocId = getAdjacentDocId(doc.id, 'next');
    const prevDocId = getAdjacentDocId(doc.id, 'prev');

    const handleKey = (e) => {
      /* 입력 중일 땐 단축키 무시 */
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      /* A: 승인 */
      if ((e.key === 'a' || e.key === 'A') && myTurn) {
        e.preventDefault();
        handleProcessRef.current?.('approved');
      }
      /* R: 반려 */
      else if ((e.key === 'r' || e.key === 'R') && myTurn) {
        e.preventDefault();
        if (!comment.trim()) {
          toast.info('반려는 사유 입력이 필요해요. 의견란을 클릭해주세요.');
          return;
        }
        handleProcessRef.current?.('rejected');
      }
      /* J 또는 → : 다음 */
      else if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowRight') {
        if (nextDocId) {
          e.preventDefault();
          setCurrentDocId(nextDocId);
        }
      }
      /* K 또는 ← : 이전 */
      else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowLeft') {
        if (prevDocId) {
          e.preventDefault();
          setCurrentDocId(prevDocId);
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, doc, processing, result, comment, user, getAdjacentDocId]);

  if (!isOpen) return null;

  /* ── 파생 변수 ── */
  const step = doc?.current_step || 0;
  const apvs = doc?.approvers || [];
  const uid = user?.id;

  const isCurApvr =
    doc &&
    apvs[step]?.id === uid &&
    !['approved', 'rejected', 'canceled'].includes(doc.status);
  const isDrafter = doc && doc.drafter_id === uid;
  const canCancel = isDrafter && ['pending', 'draft'].includes(doc?.status);
  const isAdmin = profile?.is_admin === true;

  const fieldEntries = doc
    ? Object.entries(doc.fields || {}).filter(([, v]) => v)
    : [];

  const attachments = detectAttachments(doc?.body);

  /* 인접 문서 */
  const prevId = doc ? getAdjacentDocId(doc.id, 'prev') : null;
  const nextId = doc ? getAdjacentDocId(doc.id, 'next') : null;
  const goPrev = () => prevId && setCurrentDocId(prevId);
  const goNext = () => nextId && setCurrentDocId(nextId);

  /* ── 액션 핸들러 ── */
  const handleProcess = async (action) => {
    if (action === 'rejected' && !comment.trim()) {
      toast.warning('반려 사유를 입력해주세요');
      return;
    }
    if (action === 'rejected') {
      if (!window.confirm('이 문서를 반려하시겠습니까?')) return;
    }
    setProcessing(true);
    const res = await processApproval(currentDocId, action, comment);
    setProcessing(false);

    if (res.ok) {
      /* ⭐ 빠른 모드 — 결과 모달 안 띄우고 바로 다음 대기 문서로 */
      if (powerModeActive) {
        incrementPowerModeProcessed();
        toast.success(action === 'approved' ? '승인 완료' : '반려 완료');

        const remaining = myPendingDocIds.filter((id) => id !== currentDocId);
        if (remaining.length > 0) {
          setCurrentDocId(remaining[0]);
          setComment('');
        } else {
          toast.success('🎉 모든 결재 대기 문서를 처리했어요!');
          exitPowerMode();
          onComplete?.();
          onClose();
        }
        return;
      }

      setResult(res.message);
      if (res.linkageResult?.message) {
        toast.info(`자동 연동: ${res.linkageResult.message}`);
      }
    } else {
      toast.error(res.error || '처리에 실패했습니다.');
    }
  };

  /* ref 에 최신 handleProcess 저장 — 단축키에서 호출 */
  handleProcessRef.current = handleProcess;

  const handleCancel = async () => {
    if (!window.confirm('이 기안을 취소하시겠습니까?\n취소 후에는 복구할 수 없습니다.')) return;
    setProcessing(true);
    const ok = await cancelApproval(currentDocId);
    setProcessing(false);
    if (ok) {
      setResult({ icon: '🚫', title: '기안 취소 완료', desc: '기안이 취소되었습니다.' });
    } else {
      toast.error('취소에 실패했습니다.');
    }
  };

  const handleAdminDelete = async () => {
    if (!window.confirm('관리자 권한으로 이 문서를 완전 삭제하시겠습니까?\n복구할 수 없습니다.')) return;
    setProcessing(true);
    const ok = await adminDeleteApproval(currentDocId);
    setProcessing(false);
    if (ok) {
      toast.success('삭제되었습니다');
      onComplete?.();
      onClose();
    } else {
      toast.error('삭제 실패');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResultClose = () => {
    setResult(null);
    onComplete?.();
    onClose();
  };

  const statusInfo = doc ? getStatusInfo(doc.status, step, apvs.length) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={null} hideHeader>
      {loading ? (
        <div className="appr-view-loading">
          <i className="fa-solid fa-spinner fa-spin" />
          <p>문서를 불러오는 중...</p>
        </div>
      ) : !doc ? (
        <div className="appr-view-loading">
          <i className="fa-regular fa-folder-open" />
          <p>문서를 찾을 수 없습니다</p>
        </div>
      ) : (
        <>
          {/* ── 결과 화면 ── */}
          {result ? (
            <div className="appr-result-screen">
              <div className="appr-result-icon">{result.icon}</div>
              <h2>{result.title}</h2>
              <p>{result.desc}</p>
              <button type="button" className="btn btn-in" onClick={handleResultClose}>
                확인
              </button>
            </div>
          ) : (
            <div className="appr-view-v2">
              {/* ── 헤더 ── */}
              <header className="appr-view-header">
                <div className="appr-view-header-left">
                  <div className="appr-view-type-row">
                    {powerModeActive && (
                      <span className="appr-power-mode-badge">
                        <i className="fa-solid fa-bolt" />
                        빠른 모드 · {powerModeProcessed}/
                        {powerModeProcessed + (myPendingDocIds?.length || 0)}
                      </span>
                    )}
                    <span className="appr-view-type">
                      <i className="fa-solid fa-file-signature" /> {doc.type}
                    </span>
                    <span className="appr-view-num">{doc.doc_number}</span>
                    {doc.urgency === '긴급' && (
                      <span className="appr-view-urgency">🔴 긴급</span>
                    )}
                    {statusInfo && (
                      <span className={`status-badge ${statusInfo.cls || ''}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  <h2 className="appr-view-title">{doc.title}</h2>
                </div>

                <div className="appr-view-header-actions">
                  <button
                    type="button"
                    className="appr-view-nav-btn"
                    onClick={goPrev}
                    disabled={!prevId}
                    title="이전 문서 (K)"
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <button
                    type="button"
                    className="appr-view-nav-btn"
                    onClick={goNext}
                    disabled={!nextId}
                    title="다음 문서 (J)"
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                  <button
                    type="button"
                    className="appr-view-nav-btn"
                    onClick={handlePrint}
                    title="인쇄"
                  >
                    <i className="fa-solid fa-print" />
                  </button>
                  <button
                    type="button"
                    className="appr-view-close-btn"
                    onClick={onClose}
                    title="닫기 (ESC)"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              </header>

              {/* ── 결재 진행 타임라인 ── */}
              {apvs.length > 0 && (
                <div className="appr-timeline">
                  <h4 className="appr-section-title">
                    <i className="fa-solid fa-route" />
                    결재 진행
                  </h4>
                  <div className="appr-timeline-track">
                    {/* 기안자 */}
                    <div className="appr-timeline-step done">
                      <div className="appr-timeline-dot done">
                        <i className="fa-solid fa-pen" />
                      </div>
                      <div className="appr-timeline-info">
                        <span className="appr-timeline-role">기안</span>
                        <strong>{doc.drafter_name}</strong>
                        <span className="appr-timeline-time">{fmtDateTime(doc.created_at)}</span>
                      </div>
                    </div>

                    {/* 결재자들 */}
                    {apvs.map((apv, idx) => {
                      let stepCls = 'pending';
                      let dotIcon = 'fa-clock';
                      let label = `${idx + 1}차 결재`;
                      if (idx < step) {
                        stepCls = apv.status === 'rejected' ? 'rejected' : 'done';
                        dotIcon = apv.status === 'rejected' ? 'fa-xmark' : 'fa-check';
                      } else if (idx === step && doc.status === 'in_progress') {
                        stepCls = 'current';
                        dotIcon = 'fa-hourglass-half';
                      }
                      if (doc.status === 'approved' && idx === apvs.length - 1) {
                        stepCls = 'done';
                        dotIcon = 'fa-check';
                        label = '최종 결재';
                      }
                      return (
                        <div key={idx} className={`appr-timeline-step ${stepCls}`}>
                          <div className={`appr-timeline-dot ${stepCls}`}>
                            <i className={`fa-solid ${dotIcon}`} />
                          </div>
                          <div className="appr-timeline-info">
                            <span className="appr-timeline-role">{label}</span>
                            <strong>{apv.name}</strong>
                            {apv.acted_at && (
                              <span className="appr-timeline-time">{fmtDateTime(apv.acted_at)}</span>
                            )}
                            {stepCls === 'current' && (
                              <span className="appr-timeline-time current-text">처리 대기 중</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── 문서 정보 ── */}
              <div className="appr-view-section">
                <h4 className="appr-section-title">
                  <i className="fa-solid fa-circle-info" />
                  문서 정보
                </h4>
                <div className="appr-view-info-grid">
                  <div><span>기안자</span><strong>{doc.drafter_name} · {doc.drafter_dept || '-'}</strong></div>
                  <div><span>기안일</span><strong>{fmtDateTime(doc.created_at)}</strong></div>
                  <div><span>양식</span><strong>{doc.type}</strong></div>
                  <div><span>긴급도</span><strong>{doc.urgency || '일반'}</strong></div>
                  {fieldEntries.map(([key, value]) => (
                    <div key={key}>
                      <span>{FIELD_LABELS[key] || key}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 본문 ── */}
              <div className="appr-view-section">
                <h4 className="appr-section-title">
                  <i className="fa-solid fa-align-left" />
                  본문
                </h4>
                <div className="appr-view-body">
                  {(doc.body || '내용 없음').split('\n').map((line, i) => (
                    <p key={i}>{line || '\u00A0'}</p>
                  ))}
                </div>
              </div>

              {/* ── 첨부파일 ── */}
              {attachments.length > 0 && (
                <div className="appr-view-section">
                  <h4 className="appr-section-title">
                    <i className="fa-solid fa-paperclip" />
                    첨부파일
                    <span className="appr-section-count">{attachments.length}</span>
                  </h4>
                  <div className="appr-view-attachments">
                    {attachments.map((f, i) => {
                      const meta = getFileIcon(f.name);
                      return (
                        <div key={i} className="appr-view-attach-item">
                          <span
                            className="appr-view-attach-icon"
                            style={{ background: `${meta.color}15`, color: meta.color }}
                          >
                            <i className={`fa-solid ${meta.icon}`} />
                          </span>
                          <div className="appr-view-attach-body">
                            <div className="appr-view-attach-name">{f.name}</div>
                            <div className="appr-view-attach-size">{f.size} KB</div>
                          </div>
                          <button
                            type="button"
                            className="appr-view-attach-btn"
                            onClick={() => toast.info('다운로드는 준비 중이에요')}
                            title="다운로드"
                          >
                            <i className="fa-solid fa-download" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── 결재 의견 스레드 ── */}
              <div className="appr-view-section">
                <h4 className="appr-section-title">
                  <i className="fa-regular fa-comments" />
                  결재 의견
                </h4>
                <div className="appr-comment-thread">
                  {apvs.map((apv, idx) => {
                    const hasComment = apv.comment || apv.status !== 'waiting';
                    if (!hasComment && idx !== step) return null;

                    let statusIcon = 'fa-clock';
                    let statusColor = '#94a3b8';
                    let statusLabel = '대기 중';
                    if (apv.status === 'approved') {
                      statusIcon = 'fa-check';
                      statusColor = '#06d6a0';
                      statusLabel = '승인';
                    } else if (apv.status === 'rejected') {
                      statusIcon = 'fa-xmark';
                      statusColor = '#f72585';
                      statusLabel = '반려';
                    } else if (idx === step && doc.status === 'in_progress') {
                      statusIcon = 'fa-hourglass-half';
                      statusColor = '#4361ee';
                      statusLabel = '처리 중';
                    }

                    return (
                      <div key={idx} className="appr-comment-card">
                        <div
                          className="appr-comment-avatar"
                          style={{ backgroundImage: `url('${avatarUrl(apv)}')` }}
                        />
                        <div className="appr-comment-body">
                          <div className="appr-comment-head">
                            <strong>{apv.name}</strong>
                            <span className="appr-comment-role">{idx + 1}차 결재</span>
                            <span
                              className="appr-comment-status"
                              style={{ background: `${statusColor}15`, color: statusColor }}
                            >
                              <i className={`fa-solid ${statusIcon}`} /> {statusLabel}
                            </span>
                            {apv.acted_at && (
                              <span className="appr-comment-time">{fmtDateTime(apv.acted_at)}</span>
                            )}
                          </div>
                          <p className={`appr-comment-text ${!apv.comment ? 'empty' : ''}`}>
                            {apv.comment || (idx === step ? '(처리를 기다리고 있어요)' : '의견 없음')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── 의견 입력 (내 차례일 때) ── */}
              {isCurApvr && (
                <div className="appr-view-action-area">
                  <h4 className="appr-section-title">
                    <i className="fa-solid fa-pen-to-square" />
                    결재 의견 입력
                  </h4>

                  {/* ⭐ 단축키 안내 (빠른 모드일 때만) */}
                  {powerModeActive && (
                    <div className="appr-shortcuts-hint">
                      <span>
                        <kbd>A</kbd> 승인
                      </span>
                      <span>
                        <kbd>R</kbd> 반려 (사유 입력 후)
                      </span>
                      <span>
                        <kbd>J</kbd> 다음 / <kbd>K</kbd> 이전
                      </span>
                      <span>
                        <kbd>ESC</kbd> 종료
                      </span>
                    </div>
                  )}

                  {/* 추천 의견 */}
                  <div className="appr-quick-comments">
                    <span className="appr-quick-label">추천 의견:</span>
                    {(actionMode === 'rejected' ? QUICK_COMMENTS.rejected : QUICK_COMMENTS.approved).map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="appr-quick-comment-chip"
                        onClick={() => setComment(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="appr-comment-input"
                    placeholder={actionMode === 'rejected' ? '반려 사유를 입력해주세요...' : '의견을 입력하세요 (선택)'}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />

                  <div className="appr-action-buttons">
                    <button
                      type="button"
                      className="appr-action-btn reject"
                      onMouseEnter={() => setActionMode('rejected')}
                      onMouseLeave={() => setActionMode(null)}
                      onClick={() => handleProcess('rejected')}
                      disabled={processing}
                    >
                      <i className="fa-solid fa-xmark" /> 반려
                    </button>
                    <button
                      type="button"
                      className="appr-action-btn approve"
                      onMouseEnter={() => setActionMode('approved')}
                      onMouseLeave={() => setActionMode(null)}
                      onClick={() => handleProcess('approved')}
                      disabled={processing}
                    >
                      <i className="fa-solid fa-check" /> 승인
                    </button>
                  </div>
                </div>
              )}

              {/* ── 기안자 액션 ── */}
              {canCancel && (
                <div className="appr-view-action-area">
                  <button
                    type="button"
                    className="appr-action-btn ghost danger"
                    onClick={handleCancel}
                    disabled={processing}
                  >
                    <i className="fa-solid fa-ban" /> 기안 취소
                  </button>
                </div>
              )}

              {/* ── 관리자 액션 ── */}
              {isAdmin && (
                <div className="appr-view-action-area">
                  <button
                    type="button"
                    className="appr-action-btn ghost danger"
                    onClick={handleAdminDelete}
                    disabled={processing}
                  >
                    <i className="fa-solid fa-trash" /> 관리자 삭제
                  </button>
                </div>
              )}

              {/* 🔗 연결된 자료 */}
              {doc?.id && (
                <ContextWidget
                  kind="approval"
                  id={doc.id}
                  exclude={['approvals']}
                />
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}