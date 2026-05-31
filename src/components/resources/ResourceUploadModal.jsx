// 파일 업로드 모달 — 드래그앤드롭 + 카테고리/설명/공개 범위 설정.

import { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../common/Modal';
import { useResource, VISIBILITY_LABELS } from '../../contexts/ResourceContext';
import { useToast } from '../../contexts/ToastContext';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatFileSize } from '../../lib/nexusFile';

export default function ResourceUploadModal() {
  const toast = useToast();
  const { user } = useAuth();
  const {
    uploadModal, closeUploadModal,
    categories, uploadFiles, uploading,
  } = useResource();

  let members = [];
  try {
    const orgCtx = useOrgChart();
    members = orgCtx?.members || [];
  } catch {
    members = [];
  }

  const { open } = uploadModal;
  const fileInputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [categoryId, setCategoryId] = useState(null);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [shareWith, setShareWith] = useState([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  /* 열릴 때 초기화 */
  useEffect(() => {
    if (!open) return;
    setSelectedFiles([]);
    setDragActive(false);
    setCategoryId(null);
    setDescription('');
    setVisibility('public');
    setShareWith([]);
    setShowMemberPicker(false);
    setMemberSearch('');
  }, [open]);

  /* 파일 추가 */
  const addFiles = (files) => {
    const newOnes = Array.from(files);
    setSelectedFiles((prev) => {
      /* 중복 제거 (이름+크기로) */
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
      return [...prev, ...newOnes.filter((f) => !seen.has(`${f.name}-${f.size}`))];
    });
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  /* 드래그 핸들러 */
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragActive(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) addFiles(files);
  };

  /* 공유 멤버 토글 */
  const toggleShareWith = (uid) => {
    if (uid === user?.id) return;
    setShareWith((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const availableMembers = useMemo(() => {
    return members.filter((m) => m.id !== user?.id);
  }, [members, user]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return availableMembers;
    const q = memberSearch.trim().toLowerCase();
    return availableMembers.filter(
      (m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q)
    );
  }, [availableMembers, memberSearch]);

  const selectedMembers = useMemo(
    () => members.filter((m) => shareWith.includes(m.id)),
    [members, shareWith]
  );

  /* 업로드 실행 */
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('파일을 선택해주세요.');
      return;
    }

    const res = await uploadFiles(selectedFiles, {
      categoryId,
      description: description.trim() || null,
      visibility,
      shareWith: visibility === 'restricted' ? shareWith : [],
    });

    if (res.ok) {
      toast.success(`${res.count}개 파일을 업로드했어요.`);
      closeUploadModal();
    } else {
      toast.error(res.error || '업로드 실패');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={closeUploadModal}
      size="md"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--primary-color)' }} />
          파일 업로드
        </span>
      }
    >
      <div className="resource-upload-body">
        {/* 드롭존 */}
        <div
          className={`resource-upload-dropzone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="fa-solid fa-cloud-arrow-up" />
          <p>여기로 드래그하거나 클릭해서 파일을 선택하세요</p>
          <span>한 번에 여러 파일 업로드 가능</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {/* 선택된 파일 리스트 */}
        {selectedFiles.length > 0 && (
          <div className="resource-upload-files">
            <div className="resource-upload-files-header">
              <span>선택된 파일</span>
              <strong>{selectedFiles.length}개</strong>
            </div>
            <div className="resource-upload-files-list">
              {selectedFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="resource-upload-file-item">
                  <i className="fa-solid fa-file" />
                  <div className="resource-upload-file-info">
                    <strong title={file.name}>{file.name}</strong>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    title="제거"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 카테고리 */}
        <div className="resource-upload-field">
          <label>카테고리</label>
          <div className="resource-upload-cat-list">
            <button
              type="button"
              className={`resource-upload-cat-chip ${!categoryId ? 'active' : ''}`}
              onClick={() => setCategoryId(null)}
            >
              <i className="fa-solid fa-ban" />
              없음
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`resource-upload-cat-chip ${categoryId === c.id ? 'active' : ''}`}
                style={
                  categoryId === c.id
                    ? { background: c.color, borderColor: c.color, color: '#fff' }
                    : { borderColor: `${c.color}50`, color: c.color }
                }
                onClick={() => setCategoryId(c.id)}
              >
                <i className={`fa-solid ${c.icon}`} />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 설명 */}
        <div className="resource-upload-field">
          <label>설명 <span className="hint">(선택)</span></label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="파일에 대한 간단한 설명"
            maxLength={500}
          />
        </div>

        {/* 공개 범위 */}
        <div className="resource-upload-field">
          <label>공개 범위</label>
          <div className="resource-upload-vis-grid">
            {Object.entries(VISIBILITY_LABELS).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                className={`resource-upload-vis-btn ${visibility === key ? 'active' : ''}`}
                style={
                  visibility === key
                    ? { background: meta.color, borderColor: meta.color, color: '#fff' }
                    : { borderColor: `${meta.color}50`, color: meta.color }
                }
                onClick={() => setVisibility(key)}
              >
                <i className={`fa-solid ${meta.icon}`} />
                <div>
                  <strong>{meta.label}</strong>
                  <em>{key === 'public' ? '모든 직원이 볼 수 있음' : '선택한 동료만 볼 수 있음'}</em>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 공유 대상 (restricted일 때만) */}
        {visibility === 'restricted' && (
          <div className="resource-upload-field">
            <label>
              공유받을 동료
              {shareWith.length > 0 && (
                <span className="resource-upload-share-count">{shareWith.length}명</span>
              )}
            </label>

            {selectedMembers.length > 0 && (
              <div className="resource-upload-share-chips">
                {selectedMembers.map((m) => (
                  <div key={m.id} className="resource-upload-share-chip">
                    <div
                      className="resource-upload-share-avatar"
                      style={{ backgroundImage: `url('https://i.pravatar.cc/100?u=${m.id}')` }}
                    />
                    <span>{m.full_name}</span>
                    <button
                      type="button"
                      onClick={() => toggleShareWith(m.id)}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="resource-upload-share-add"
              onClick={() => setShowMemberPicker((v) => !v)}
            >
              <i className={`fa-solid ${showMemberPicker ? 'fa-chevron-up' : 'fa-plus'}`} />
              {showMemberPicker ? '닫기' : '동료 추가'}
            </button>

            {showMemberPicker && (
              <div className="resource-upload-member-picker">
                <input
                  type="text"
                  placeholder="이름·부서로 검색..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                <div className="resource-upload-member-list">
                  {filteredMembers.length === 0 ? (
                    <div className="resource-upload-member-empty">검색 결과가 없어요</div>
                  ) : (
                    filteredMembers.map((m) => {
                      const isSelected = shareWith.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`resource-upload-member-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleShareWith(m.id)}
                        >
                          <div
                            className="resource-upload-share-avatar"
                            style={{ backgroundImage: `url('https://i.pravatar.cc/100?u=${m.id}')` }}
                          />
                          <div>
                            <strong>{m.full_name}</strong>
                            <span>{m.department}{m.rank && ` · ${m.rank}`}</span>
                          </div>
                          {isSelected && <i className="fa-solid fa-check" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="modal-buttons">
        <button
          type="button"
          className="btn btn-out"
          onClick={closeUploadModal}
          disabled={uploading}
        >
          취소
        </button>
        <button
          type="button"
          className="btn btn-in"
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
        >
          {uploading ? (
            <><i className="fa-solid fa-spinner fa-spin" /> 업로드 중...</>
          ) : (
            <><i className="fa-solid fa-cloud-arrow-up" /> {selectedFiles.length}개 파일 업로드</>
          )}
        </button>
      </div>
    </Modal>
  );
}