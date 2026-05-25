import { formatFileSize, getFileIcon, getPublicUrl, isImage } from '../../lib/nexusFile';

export default function AttachmentList({ attachments = [] }) {
  if (!attachments || attachments.length === 0) return null;

  const handleDownload = (att) => {
    const url = getPublicUrl(att.path);
    if (!url) return;
    // 새 탭에서 열기 (이미지는 미리보기, 그 외 다운로드)
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (!isImage(att.name)) a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="attach-section">
      <div className="attach-section-title">
        <i className="fa-solid fa-paperclip"></i> 첨부파일{' '}
        <span className="attach-count">{attachments.length}</span>
      </div>
      <div className="attach-list">
        {attachments.map((att) => (
          <div
            key={att.path}
            className="attach-card"
            onClick={() => handleDownload(att)}
          >
            <i className={`fa-solid ${getFileIcon(att.name)} attach-card-icon`}></i>
            <div className="attach-card-info">
              <div className="attach-card-name">{att.name}</div>
              <div className="attach-card-size">{formatFileSize(att.size)}</div>
            </div>
            <i className="fa-solid fa-download attach-card-dl"></i>
          </div>
        ))}
      </div>
    </div>
  );
}