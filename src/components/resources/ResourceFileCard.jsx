// components/resources/ResourceFileCard.jsx
// 업로드된 파일 카드 1개 — 원본 renderResources 의 file-card 이관.
// 카드 클릭 → 다운로드(새 탭), 삭제 버튼 → 영구 삭제(확인 후).

import { useResource } from '../../contexts/ResourceContext';
import { getFileIcon, formatFileSize } from '../../lib/nexusFile';
import { useToast } from '../../contexts/ToastContext';

/* 확장자별 아이콘 색상 — 원본 renderResources 의 iconColor 분기 이관 */
function iconColor(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'var(--danger)';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'var(--success)';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext))
    return 'var(--primary-color)';
  if (['doc', 'docx'].includes(ext)) return '#2b579a';
  return 'var(--text-muted)';
}

export default function ResourceFileCard({ resource }) {
  const toast = useToast();
  const { deleteResource } = useResource();

  const fileName = resource.file_name || '파일';
  const fileUrl = resource.file_url;

  /* 다운로드 — 원본 downloadResource 이관 */
  const handleDownload = () => {
    if (!fileUrl) {
      toast.warning(`[${fileName}] 다운로드 URL 이 없습니다.`);
      return;
    }
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* 삭제 — 영구 삭제, confirm 후에만 */
  const handleDelete = async (e) => {
    e.stopPropagation(); // 카드 클릭(다운로드) 막기
    if (!window.confirm(`[${fileName}] 파일을 정말 삭제하시겠습니까?`)) return;
    const result = await deleteResource(resource.id);
    if (result.ok) {
      toast.success('파일이 삭제되었습니다.');
    } else {
      toast.error(`삭제 실패: ${result.error || ''}`);
    }
  };

  return (
    <div className="file-card" onClick={handleDownload}>
      <i
        className={`fa-solid ${getFileIcon(fileName)} file-icon`}
        style={{ color: iconColor(fileName) }}
      />
      <h4 title={fileName}>{fileName}</h4>
      <p>{formatFileSize(resource.file_size || 0)}</p>
      <button
        type="button"
        className="delete-btn"
        onClick={handleDelete}
        title="삭제"
      >
        <i className="fa-solid fa-trash" />
      </button>
    </div>
  );
}