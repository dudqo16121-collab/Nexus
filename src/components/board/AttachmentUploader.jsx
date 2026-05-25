import { useRef, useState } from 'react';
import { uploadMany, remove, formatFileSize, getFileIcon } from '../../lib/nexusFile';

export default function AttachmentUploader({ attachments, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploaded = await uploadMany(files, 'board');
    setUploading(false);

    if (uploaded.length > 0) {
      onChange([...attachments, ...uploaded]);
    }
    // input 초기화 (같은 파일 다시 선택 가능하게)
    e.target.value = '';
  };

  const handleRemove = async (idx) => {
    const att = attachments[idx];
    if (!att) return;
    // Storage에서도 삭제
    await remove(att.path);
    onChange(attachments.filter((_, i) => i !== idx));
  };

  return (
    <div className="attach-uploader">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <button
        type="button"
        className="attach-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <i className="fa-solid fa-spinner fa-spin"></i> 업로드 중...
          </>
        ) : (
          <>
            <i className="fa-solid fa-paperclip"></i> 파일 첨부 (최대 25MB)
          </>
        )}
      </button>

      {attachments.length > 0 && (
        <div className="attach-chip-area">
          {attachments.map((att, idx) => (
            <div key={att.path} className="attach-chip">
              <i className={`fa-solid ${getFileIcon(att.name)}`}></i>
              <span className="attach-chip-name">{att.name}</span>
              <span className="attach-chip-size">{formatFileSize(att.size)}</span>
              <button
                type="button"
                className="attach-chip-remove"
                onClick={() => handleRemove(idx)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}