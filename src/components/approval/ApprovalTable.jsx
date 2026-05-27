// 결재함 테이블 (2단계 + 5단계 통합) — 리스트/카드 뷰 토글

import { useState, useMemo, useEffect } from 'react';
import { useApproval, getStatusInfo } from '../../contexts/ApprovalContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonTable } from '../common/Skeleton';

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const TYPE_META = {
  업무기안서: { icon: 'fa-briefcase',     color: '#4361ee', short: '업무' },
  지출결의서: { icon: 'fa-coins',         color: '#f72585', short: '지출' },
  연차신청서: { icon: 'fa-umbrella-beach', color: '#06d6a0', short: '연차' },
  출장신청서: { icon: 'fa-plane',         color: '#ff9f1c', short: '출장' },
  구매요청서: { icon: 'fa-cart-shopping', color: '#8338ec', short: '구매' },
  품의서:     { icon: 'fa-file-lines',    color: '#64748b', short: '품의' },
};

const URGENCY_COLOR = {
  긴급: '#f72585',
  보통: '#ff9f1c',
  일반: 'transparent',
};

const VIEW_KEY = 'nexus_appr_view_mode';

export default function ApprovalTable({ onSelectDoc }) {
  const { filteredApprovals, loading, processBulk, isMyTurn, tab } = useApproval();
  const { user } = useAuth();
  const toast = useToast();

  /* 뷰 모드 — localStorage 로 영구 보존 */
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem(VIEW_KEY) || 'list';
  });
  useEffect(() => {
    localStorage.setItem(VIEW_KEY, viewMode);
  }, [viewMode]);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const myTurnIds = useMemo(() => {
    if (!user) return new Set();
    return new Set(
      filteredApprovals.filter((d) => isMyTurn(d)).map((d) => d.id)
    );
  }, [filteredApprovals, isMyTurn, user]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllMyTurn = () => setSelectedIds(new Set(myTurnIds));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulk = async (action) => {
    const ids = [...selectedIds].filter((id) => myTurnIds.has(id));
    if (ids.length === 0) {
      toast.warning('내가 결재할 수 있는 문서를 선택해주세요');
      return;
    }
    const label = action === 'approved' ? '승인' : '반려';
    if (!window.confirm(`선택한 ${ids.length}건을 일괄 ${label}하시겠습니까?`)) return;

    setBulkProcessing(true);
    const res = await processBulk(ids, action);
    setBulkProcessing(false);

    if (res.successCount > 0) {
      toast.success(`${res.successCount}건 ${label} 완료${res.failCount > 0 ? ` (${res.failCount}건 실패)` : ''}`);
      clearSelection();
    } else {
      toast.error('일괄 처리 실패');
    }
  };

  const handleQuickAction = async (e, doc, action) => {
    e.stopPropagation();
    const label = action === 'approved' ? '승인' : '반려';
    if (action === 'rejected') {
      if (!window.confirm(`"${doc.title}" 문서를 반려하시겠습니까?`)) return;
    }
    const res = await processBulk([doc.id], action);
    if (res.successCount > 0) toast.success(`${label} 완료`);
    else toast.error('처리 실패');
  };

  if (loading && filteredApprovals.length === 0) {
    return (
      <div style={{ padding: '8px 0' }}>
        <SkeletonTable rows={6} cols={7} />
      </div>
    );
  }

  if (filteredApprovals.length === 0) {
    return (
      <div className="appr-empty">
        <i className="fa-solid fa-folder-open" />
        <p className="appr-empty-title">문서가 없습니다</p>
        <p className="appr-empty-sub">기안 작성 버튼으로 새 문서를 상신하세요.</p>
      </div>
    );
  }

  const hasMyTurnInList = myTurnIds.size > 0;
  const selectedCount = selectedIds.size;

  return (
    <div className="appr-list-v2">
      {/* ⭐ 뷰 토글 + 일괄 액션 바 */}
      <div className="appr-view-bar">
        {/* 일괄 액션 바 — 선택 시 */}
        {selectedCount > 0 ? (
          <div className="appr-bulk-bar appr-bulk-bar-inline">
            <span className="appr-bulk-info">
              <i className="fa-solid fa-check-double" />
              {selectedCount}건 선택
            </span>
            <div className="appr-bulk-actions">
              <button
                type="button"
                className="appr-bulk-btn approve"
                onClick={() => handleBulk('approved')}
                disabled={bulkProcessing}
              >
                <i className="fa-solid fa-check" /> 일괄 승인
              </button>
              <button
                type="button"
                className="appr-bulk-btn reject"
                onClick={() => handleBulk('rejected')}
                disabled={bulkProcessing}
              >
                <i className="fa-solid fa-xmark" /> 일괄 반려
              </button>
              <button
                type="button"
                className="appr-bulk-btn ghost"
                onClick={clearSelection}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          </div>
        ) : (
          <div className="appr-view-bar-left">
            {/* 전체 선택 (결재 대기 탭에서만) */}
            {hasMyTurnInList && tab === 'pending_me' && (
              <label className="appr-checkbox-label">
                <input
                  type="checkbox"
                  checked={myTurnIds.size > 0 && selectedCount === myTurnIds.size}
                  onChange={() => {
                    if (selectedCount === myTurnIds.size) clearSelection();
                    else selectAllMyTurn();
                  }}
                />
                <span className="appr-checkbox-box" />
                <span>내 결재 문서 전체 선택 ({myTurnIds.size}건)</span>
              </label>
            )}
            <span className="appr-view-count">
              총 {filteredApprovals.length}건
            </span>
          </div>
        )}

        {/* 뷰 토글 */}
        <div className="appr-view-toggle">
          <button
            type="button"
            className={`appr-view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="리스트 뷰"
          >
            <i className="fa-solid fa-list" />
          </button>
          <button
            type="button"
            className={`appr-view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
            title="카드 뷰"
          >
            <i className="fa-solid fa-grip" />
          </button>
        </div>
      </div>

      {/* ── 리스트 뷰 ── */}
      {viewMode === 'list' && (
        <div className="appr-doc-list">
          {filteredApprovals.map((doc) => {
            const step = doc.current_step || 0;
            const total = doc.approvers?.length || 0;
            const statusInfo = getStatusInfo(doc.status, step, total);
            const isMyTurnDoc = myTurnIds.has(doc.id);
            const isSelected = selectedIds.has(doc.id);
            const typeMeta = TYPE_META[doc.type] || { icon: 'fa-file', color: '#64748b', short: doc.type?.slice(0, 2) || '' };
            const urgencyColor = URGENCY_COLOR[doc.urgency] || 'transparent';

            const currentApproverName =
              doc.status === 'approved' || doc.status === 'rejected' || doc.status === 'canceled'
                ? '-'
                : doc.approvers?.[step]?.name || '-';

            return (
              <div
                key={doc.id}
                className={`appr-doc-row ${isSelected ? 'selected' : ''} ${isMyTurnDoc ? 'my-turn' : ''}`}
                onClick={() => onSelectDoc(doc.id)}
              >
                <span className="appr-doc-urgency-bar" style={{ background: urgencyColor }} />

                <label className="appr-checkbox-label appr-doc-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(doc.id)}
                    disabled={!isMyTurnDoc}
                  />
                  <span className={`appr-checkbox-box ${!isMyTurnDoc ? 'disabled' : ''}`} />
                </label>

                <div className="appr-doc-body">
                  <div className="appr-doc-line1">
                    <span className="appr-doc-num">{doc.doc_number}</span>
                    <span
                      className="appr-doc-type-chip"
                      style={{ background: `${typeMeta.color}15`, color: typeMeta.color }}
                    >
                      <i className={`fa-solid ${typeMeta.icon}`} />
                      {typeMeta.short}
                    </span>
                    {doc.urgency === '긴급' && (
                      <span className="appr-doc-urgency-chip">🔴 긴급</span>
                    )}
                    <h4 className="appr-doc-title">{doc.title}</h4>
                  </div>

                  <div className="appr-doc-line2">
                    <span className="appr-doc-meta">
                      <i className="fa-solid fa-user-pen" />
                      {doc.drafter_name || '-'}
                    </span>

                    {total > 0 && (
                      <div className="appr-doc-line-dots" title={`${step}/${total} 단계`}>
                        {Array.from({ length: total }).map((_, idx) => {
                          const apv = doc.approvers?.[idx];
                          let cls = 'pending';
                          if (idx < step) cls = 'done';
                          else if (idx === step && doc.status !== 'approved' && doc.status !== 'rejected') cls = 'current';
                          if (apv?.status === 'rejected') cls = 'rejected';
                          return <span key={idx} className={`appr-line-dot ${cls}`} />;
                        })}
                      </div>
                    )}

                    <span className="appr-doc-current">
                      <i className="fa-solid fa-arrow-right" />
                      {currentApproverName}
                    </span>

                    <span className="appr-doc-date">
                      <i className="fa-regular fa-calendar" />
                      {fmtDate(doc.created_at)}
                    </span>
                  </div>
                </div>

                <span className={`appr-doc-status-badge ${statusInfo.cls || ''}`}>
                  {statusInfo.label}
                </span>

                {isMyTurnDoc && (
                  <div className="appr-doc-quick-actions">
                    <button
                      type="button"
                      className="appr-quick-btn approve"
                      onClick={(e) => handleQuickAction(e, doc, 'approved')}
                      title="빠른 승인"
                    >
                      <i className="fa-solid fa-check" />
                    </button>
                    <button
                      type="button"
                      className="appr-quick-btn reject"
                      onClick={(e) => handleQuickAction(e, doc, 'rejected')}
                      title="빠른 반려"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ⭐ 카드 뷰 (5단계) ── */}
      {viewMode === 'card' && (
        <div className="appr-doc-cards">
          {filteredApprovals.map((doc) => {
            const step = doc.current_step || 0;
            const total = doc.approvers?.length || 0;
            const statusInfo = getStatusInfo(doc.status, step, total);
            const isMyTurnDoc = myTurnIds.has(doc.id);
            const isSelected = selectedIds.has(doc.id);
            const typeMeta = TYPE_META[doc.type] || { icon: 'fa-file', color: '#64748b', short: doc.type?.slice(0, 2) || '' };
            const urgencyColor = URGENCY_COLOR[doc.urgency] || 'transparent';

            const currentApproverName =
              doc.status === 'approved' ? '결재 완료'
              : doc.status === 'rejected' ? '반려됨'
              : doc.status === 'canceled' ? '취소됨'
              : `${doc.approvers?.[step]?.name || '-'} 결재중`;

            return (
              <div
                key={doc.id}
                className={`appr-doc-card ${isSelected ? 'selected' : ''} ${isMyTurnDoc ? 'my-turn' : ''}`}
                onClick={() => onSelectDoc(doc.id)}
                style={{ '--card-type-color': typeMeta.color }}
              >
                <span className="appr-card-urgency-bar" style={{ background: urgencyColor }} />

                {/* 헤더 */}
                <div className="appr-card-head">
                  <span className="appr-card-num">{doc.doc_number}</span>
                  {isMyTurnDoc && (
                    <label className="appr-checkbox-label" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(doc.id)}
                      />
                      <span className="appr-checkbox-box" />
                    </label>
                  )}
                </div>

                <div className="appr-card-chips">
                  <span
                    className="appr-doc-type-chip"
                    style={{ background: `${typeMeta.color}15`, color: typeMeta.color }}
                  >
                    <i className={`fa-solid ${typeMeta.icon}`} />
                    {typeMeta.short}
                  </span>
                  {doc.urgency === '긴급' && (
                    <span className="appr-doc-urgency-chip">🔴 긴급</span>
                  )}
                </div>

                {/* 제목 */}
                <h4 className="appr-card-title">{doc.title}</h4>

                {/* 결재 라인 + 현재 결재자 */}
                {total > 0 && (
                  <div className="appr-card-progress">
                    <div className="appr-doc-line-dots">
                      {Array.from({ length: total }).map((_, idx) => {
                        const apv = doc.approvers?.[idx];
                        let cls = 'pending';
                        if (idx < step) cls = 'done';
                        else if (idx === step && doc.status !== 'approved' && doc.status !== 'rejected') cls = 'current';
                        if (apv?.status === 'rejected') cls = 'rejected';
                        return <span key={idx} className={`appr-line-dot ${cls}`} />;
                      })}
                    </div>
                    <span className="appr-card-current">{currentApproverName}</span>
                  </div>
                )}

                {/* 푸터 */}
                <div className="appr-card-foot">
                  <span className="appr-card-drafter">
                    <i className="fa-solid fa-user-pen" />
                    {doc.drafter_name || '-'} · {fmtDate(doc.created_at)}
                  </span>
                  <span className={`appr-doc-status-badge ${statusInfo.cls || ''}`}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* 빠른 액션 */}
                {isMyTurnDoc && (
                  <div className="appr-card-quick-actions">
                    <button
                      type="button"
                      className="appr-quick-btn approve"
                      onClick={(e) => handleQuickAction(e, doc, 'approved')}
                      title="빠른 승인"
                    >
                      <i className="fa-solid fa-check" />
                    </button>
                    <button
                      type="button"
                      className="appr-quick-btn reject"
                      onClick={(e) => handleQuickAction(e, doc, 'rejected')}
                      title="빠른 반려"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}