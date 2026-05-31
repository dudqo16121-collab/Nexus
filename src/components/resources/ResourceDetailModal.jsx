// 파일 상세 모달 — 정보 / 미리보기 / 공유 / 다운로드 / 수정 / 삭제.

import { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { useResource, VISIBILITY_LABELS } from '../../contexts/ResourceContext';
import { useToast } from '../../contexts/ToastContext';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { useAuth } from '../../contexts/AuthContext';
import { getFileIcon, formatFileSize } from '../../lib/nexusFile';

function iconColor(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return '#ef4444';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '#22c55e';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '#4361ee';
  if (['doc', 'docx'].includes(ext)) return '#2b579a';
  if (['ppt', 'pptx'].includes(ext)) return '#d04423';
  if (['zip', 'rar', '7z'].includes(ext)) return '#8338ec';
  return '#64748b';
}

function isImage(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
}

function isPdf(name = '') {
  return name.toLowerCase().endsWith('.pdf');
}

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ResourceDetailModal() {
  const toast = useToast();
  const { user } = useAuth();
  const {
    detailModal, closeDetail,
    categories, canEdit,
    updateResource, deleteResource, recordView,
    sharesForResource, addShares, removeShare,
    toggleFavorite, isFavorite,
  } = useResource();

  /* 조직도 멤버 (공유 추가용) */
  let members = [];
  try {
    const orgCtx = useOrgChart();
    members = orgCtx?.members || [];
  } catch {
    members = [];
  }

  const { open, resource } = detailModal;

  /* 편집 상태 */
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: '',
    category_id: null,
    visibility: 'public',
  });
  const [saving, setSaving] = useState(false);

  /* 공유 추가 패널 */
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [shareSearch, setShareSearch] = useState('');

  /* 열릴 때 초기화 */
  useEffect(() => {
    if (!open || !resource) return;
    setEditForm({
      description: resource.description || '',
      category_id: resource.category_id || null,
      visibility: resource.visibility || 'public',
    });
    setEditing(false);
    setShowSharePicker(false);
    setShareSearch('');
  }, [open, resource]);

  if (!resource) return null;

  const editable = canEdit(resource);
  const fav = isFavorite(resource.id);
  const fileName = resource.file_name || '파일';
  const category = categories.find((c) => c.id === resource.category_id);
  const visibility = VISIBILITY_LABELS[resource.visibility] || VISIBILITY_LABELS.public;

  /* 현재 공유받은 멤버 목록 */
  const currentShares = sharesForResource(resource.id);
  const currentShareIds = new Set(currentShares.map((s) => s.shared_with_id));

  /* 공유 가능 멤버 (본인 + 이미 공유된 멤버 제외) */
  const availableMembers = useMemo(() => {
    return members.filter(
      (m) => m.id !== user?.id && !currentShareIds.has(m.id)
    );
  }, [members, user, currentShares]);

  const filteredMembers = useMemo(() => {
    if (!shareSearch.trim()) return availableMembers;
    const q = shareSearch.trim().toLowerCase();
    return availableMembers.filter(
      (m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q)
    );
  }, [availableMembers, shareSearch]);

  /* 다운로드 */
  const handleDownload = async () => {
    if (!resource.file_url) {
      toast.warning('다운로드 URL이 없습니다.');
      return;
    }
    await recordView(resource.id, 'download');
    const a = document.createElement('a');
    a.href = resource.file_url;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('다운로드를 시작합니다.');
  };

  /* 즐겨찾기 */
  const handleToggleFav = async () => {
    const res = await toggleFavorite(resource.id);
    if (!res.ok) toast.error(res.error || '실패');
  };

  /* 수정 저장 */
  const handleSaveEdit = async () => {
    setSaving(true);
    const res = await updateResource(resource.id, {
      description: editForm.description.trim() || null,
      category_id: editForm.category_id,
      visibility: editForm.visibility,
    });
    setSaving(false);
    if (res.ok) {
      toast.success('파일 정보가 수정되었습니다.');
      setEditing(false);
    } else {
      toast.error(res.error || '수정 실패');
    }
  };

  /* 삭제 */
  const handleDelete = async () => {
    if (!window.confirm(`"${fileName}" 파일을 정말 삭제하시겠습니까?\n복구할 수 없어요.`)) return;
    setSaving(true);
    const res = await deleteResource(resource.id);
    setSaving(false);
    if (res.ok) {
      toast.success('파일이 삭제되었습니다.');
      closeDetail();
    } else {
      toast.error(res.error || '삭제 실패');
    }
  };

  /* 공유 추가 */
  const handleAddShare = async (memberId) => {
    const res = await addShares(resource.id, [memberId]);
    if (res.ok) {
      const member = members.find((m) => m.id === memberId);
      toast.success(`${member?.full_name || '동료'}님에게 공유했어요.`);
    } else {
      toast.error(res.error || '공유 실패');
    }
  };

  /* 공유 제거 */
  const handleRemoveShare = async (memberId) => {
    const res = await removeShare(resource.id, memberId);
    if (res.ok) toast.success('공유가 해제되었어요.');
    else toast.error(res.error || '실패');
  };

  const showImagePreview = isImage(fileName) && resource.file_url;
  const showPdfPreview = isPdf(fileName) && resource.file_url;

  return (
    <Modal
      isOpen={open}
      onClose={closeDetail}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <i
            className={`fa-solid ${getFileIcon(fileName)}`}
            style={{ color: iconColor(fileName) }}
          />
          파일 상세
        </span>
      }
    >
      <div className="resource-detail-body">
        {/* 헤더 — 파일명 + 즐겨찾기 */}
        <div className="resource-detail-head">
          <div className="resource-detail-head-info">
            <h3 title={fileName}>{fileName}</h3>
            <div className="resource-detail-head-meta">
              <span>{formatFileSize(resource.file_size || 0)}</span>
              <span>·</span>
              <span>{fmtDateTime(resource.created_at)}</span>
            </div>
          </div>
          <button
            type="button"
            className={`resource-detail-fav ${fav ? 'active' : ''}`}
            onClick={handleToggleFav}
            title={fav ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            <i className={`fa-${fav ? 'solid' : 'regular'} fa-star`} />
          </button>
        </div>

        {/* 미리보기 영역 */}
        {(showImagePreview || showPdfPreview) && (
          <div className="resource-detail-preview">
            {showImagePreview && (
              <img src={resource.file_url} alt={fileName} loading="lazy" />
            )}
            {showPdfPreview && (
              <iframe
                src={resource.file_url}
                title={fileName}
                className="resource-detail-pdf"
              />
            )}
          </div>
        )}

        {/* 정보 그리드 */}
        <div className="resource-detail-info-grid">
          {/* 카테고리 */}
          <div className="resource-detail-info-item">
            <label>카테고리</label>
            {editing ? (
              <div className="resource-detail-category-picker">
                <button
                  type="button"
                  className={`resource-detail-cat-chip ${!editForm.category_id ? 'active' : ''}`}
                  onClick={() => setEditForm((p) => ({ ...p, category_id: null }))}
                >
                  <i className="fa-solid fa-ban" />
                  없음
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`resource-detail-cat-chip ${editForm.category_id === c.id ? 'active' : ''}`}
                    style={
                      editForm.category_id === c.id
                        ? { background: c.color, borderColor: c.color, color: '#fff' }
                        : { borderColor: `${c.color}50`, color: c.color }
                    }
                    onClick={() => setEditForm((p) => ({ ...p, category_id: c.id }))}
                  >
                    <i className={`fa-solid ${c.icon}`} />
                    {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {category ? (
                  <span
                    className="resource-detail-category"
                    style={{ background: `${category.color}15`, color: category.color, borderColor: `${category.color}40` }}
                  >
                    <i className={`fa-solid ${category.icon}`} />
                    {category.name}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>없음</span>
                )}
              </div>
            )}
          </div>

          {/* 공개 범위 */}
          <div className="resource-detail-info-item">
            <label>공개 범위</label>
            {editing ? (
              <div className="resource-detail-visibility-picker">
                {Object.entries(VISIBILITY_LABELS).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    className={`resource-detail-vis-btn ${editForm.visibility === key ? 'active' : ''}`}
                    style={
                      editForm.visibility === key
                        ? { background: meta.color, borderColor: meta.color, color: '#fff' }
                        : { borderColor: `${meta.color}50`, color: meta.color }
                    }
                    onClick={() => setEditForm((p) => ({ ...p, visibility: key }))}
                  >
                    <i className={`fa-solid ${meta.icon}`} />
                    {meta.label}
                  </button>
                ))}
              </div>
            ) : (
              <span
                className="resource-detail-visibility"
                style={{ color: visibility.color }}
              >
                <i className={`fa-solid ${visibility.icon}`} />
                {visibility.label}
              </span>
            )}
          </div>

          {/* 통계 */}
          <div className="resource-detail-info-item">
            <label>통계</label>
            <div className="resource-detail-stats">
              <span title="조회수">
                <i className="fa-solid fa-eye" />
                {resource.view_count || 0}
              </span>
              <span title="다운로드">
                <i className="fa-solid fa-download" />
                {resource.download_count || 0}
              </span>
            </div>
          </div>

          {/* 설명 */}
          <div className="resource-detail-info-item full">
            <label>설명</label>
            {editing ? (
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="파일에 대한 설명을 작성해주세요"
                className="resource-detail-textarea"
                maxLength={500}
              />
            ) : (
              <p className="resource-detail-description">
                {resource.description || (
                  <span style={{ color: 'var(--text-muted)' }}>설명이 없습니다</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* 공유 받은 사람들 — restricted일 때만 */}
        {(editForm.visibility === 'restricted' || (!editing && resource.visibility === 'restricted')) && (
          <div className="resource-detail-shares">
            <div className="resource-detail-shares-header">
              <label>
                <i className="fa-solid fa-user-group" /> 공유받은 사람 ({currentShares.length}명)
              </label>
              {editable && (
                <button
                  type="button"
                  className="resource-detail-share-toggle"
                  onClick={() => setShowSharePicker((v) => !v)}
                >
                  <i className={`fa-solid ${showSharePicker ? 'fa-chevron-up' : 'fa-plus'}`} />
                  {showSharePicker ? '닫기' : '추가'}
                </button>
              )}
            </div>

            {/* 현재 공유받은 사람들 */}
            {currentShares.length > 0 ? (
              <div className="resource-detail-share-chips">
                {currentShares.map((s) => {
                  const member = members.find((m) => m.id === s.shared_with_id);
                  if (!member) return null;
                  return (
                    <div key={s.id} className="resource-detail-share-chip">
                      <div
                        className="resource-detail-share-avatar"
                        style={{ backgroundImage: `url('https://i.pravatar.cc/100?u=${member.id}')` }}
                      />
                      <span>{member.full_name}</span>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => handleRemoveShare(member.id)}
                          title="공유 해제"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="resource-detail-share-empty">아직 공유받은 사람이 없어요</p>
            )}

            {/* 멤버 추가 패널 */}
            {showSharePicker && (
              <div className="resource-detail-share-picker">
                <input
                  type="text"
                  className="resource-detail-share-search"
                  placeholder="이름·부서로 검색..."
                  value={shareSearch}
                  onChange={(e) => setShareSearch(e.target.value)}
                />
                <div className="resource-detail-share-list">
                  {filteredMembers.length === 0 ? (
                    <div className="resource-detail-share-list-empty">
                      <i className="fa-regular fa-face-frown" />
                      검색 결과가 없어요
                    </div>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="resource-detail-share-list-item"
                        onClick={() => handleAddShare(m.id)}
                      >
                        <div
                          className="resource-detail-share-avatar"
                          style={{ backgroundImage: `url('https://i.pravatar.cc/100?u=${m.id}')` }}
                        />
                        <div>
                          <strong>{m.full_name}</strong>
                          <span>{m.department}{m.rank && ` · ${m.rank}`}</span>
                        </div>
                        <i className="fa-solid fa-plus" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="modal-buttons">
        {editable && !editing && (
          <button
            type="button"
            className="btn btn-out"
            onClick={handleDelete}
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            <i className="fa-solid fa-trash" /> 삭제
          </button>
        )}

        {editing ? (
          <>
            <button
              type="button"
              className="btn btn-out"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              취소
            </button>
            <button
              type="button"
              className="btn btn-in"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </>
        ) : (
          <>
            {editable && (
              <button
                type="button"
                className="btn btn-out"
                onClick={() => setEditing(true)}
              >
                <i className="fa-solid fa-pen" /> 수정
              </button>
            )}
            <button
              type="button"
              className="btn btn-in"
              onClick={handleDownload}
            >
              <i className="fa-solid fa-download" /> 다운로드
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}