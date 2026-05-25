import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useBoard } from '../../contexts/BoardContext';
import AttachmentUploader from './AttachmentUploader';   // ⭐ 추가
import { removeMany } from '../../lib/nexusFile';  
import { useToast } from '../../contexts/ToastContext';

const CATEGORIES = ['자유게시판', '공지사항', '기술공유'];

export default function WriteModal({ isOpen, onClose, editingPost = null }) {
  const toast = useToast();
  const { createPost, updatePost } = useBoard();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('자유게시판');
  const [isNotice, setIsNotice] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);

 useEffect(() => {
    if (isOpen) {
      if (editingPost) {
        setTitle(editingPost.title || '');
        setContent(editingPost.content || '');
        setCategory(editingPost.category || '자유게시판');
        setIsNotice(!!editingPost.is_notice);
        setAttachments(
          Array.isArray(editingPost.attachments)
            ? [...editingPost.attachments]
            : []
        );   // ⭐
      } else {
        setTitle('');
        setContent('');
        setCategory('자유게시판');
        setIsNotice(false);
        setAttachments([]);   // ⭐
      }
    }
  }, [isOpen, editingPost]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }

    setSaving(true);
    const payload = {
      title,
      content,
      category: isNotice ? '공지사항' : category,
      is_notice: isNotice,
      attachments,   // ⭐ 추가
    };

    const result = editingPost
      ? await updatePost(editingPost.id, payload)
      : await createPost(payload);

    setSaving(false);

    if (result) {
      onClose();
    } else {
      toast.error('처리 중 오류가 발생했습니다.');
    }
  };

  // ⭐ 취소 시 주의: 새 글 작성 중 업로드한 파일은 고아 파일이 됨
  // 간단하게 가려면 그냥 두고, 깔끔하게 가려면 아래처럼 정리
  const handleCancel = async () => {
    if (!editingPost && attachments.length > 0) {
      // 새 글인데 취소 → 업로드된 파일 정리
      if (confirm('작성을 취소하면 첨부한 파일도 삭제됩니다. 계속할까요?')) {
        await removeMany(attachments.map((a) => a.path));
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={editingPost ? '게시글 수정' : '새 게시글 작성'}
    >
      <div className="write-modal-body">
        <input
          type="text"
          className="write-title-input"
          placeholder="제목을 입력하세요 (최대 50자)"
          maxLength={50}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="write-category-row">
          <label>분류:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isNotice}
          >
            {CATEGORIES.filter((c) => c !== '공지사항').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="write-content-input"
          rows={10}
          placeholder="내용을 자유롭게 입력해주세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {/* ⭐ 첨부파일 업로더 추가 */}
        <AttachmentUploader attachments={attachments} onChange={setAttachments} />

        <label className="write-notice-check">
          <input
            type="checkbox"
            checked={isNotice}
            onChange={(e) => setIsNotice(e.target.checked)}
          />
          공지사항으로 등록 (상단 고정)
        </label>

        <div className="write-modal-actions">
          <button className="btn btn-out" onClick={handleCancel} disabled={saving}>
            취소
          </button>
          <button className="btn btn-in" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : editingPost ? '수정하기' : '등록하기'}
          </button>
        </div>
      </div>
    </Modal>
  );
}