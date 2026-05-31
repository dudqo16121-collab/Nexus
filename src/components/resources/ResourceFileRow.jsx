// 리스트 모드 파일 행.

import { useResource, VISIBILITY_LABELS } from '../../contexts/ResourceContext';
import { useToast } from '../../contexts/ToastContext';
import { getFileIcon, formatFileSize } from '../../lib/nexusFile';

function iconColor(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return '#ef4444';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '#22c55e';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '#4361ee';
  if (['doc', 'docx'].includes(ext)) return '#2b579a';
  return '#64748b';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit',
  });
}

export default function ResourceFileRow({ resource }) {
  const toast = useToast();
  const {
    categories, openDetail, toggleFavorite, isFavorite, recordView,
  } = useResource();

  const fileName = resource.file_name || '파일';
  const category = categories.find((c) => c.id === resource.category_id);
  const isFav = isFavorite(resource.id);
  const visibility = VISIBILITY_LABELS[resource.visibility] || VISIBILITY_LABELS.public;

  const handleRowClick = () => {
    recordView(resource.id, 'view');
    openDetail(resource);
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    const res = await toggleFavorite(resource.id);
    if (!res.ok) toast.error(res.error || '실패');
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!resource.file_url) {
      toast.warning('다운로드 URL이 없습니다.');
      return;
    }
    recordView(resource.id, 'download');
    const a = document.createElement('a');
    a.href = resource.file_url;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="resource-list-row" onClick={handleRowClick}>
      <div className="resource-list-cell-name" style={{ flex: 2 }}>
        <button
          type="button"
          className={`resource-row-fav ${isFav ? 'active' : ''}`}
          onClick={handleFavoriteClick}
        >
          <i className={`fa-${isFav ? 'solid' : 'regular'} fa-star`} />
        </button>
        <i
          className={`fa-solid ${getFileIcon(fileName)} resource-row-icon`}
          style={{ color: iconColor(fileName) }}
        />
        <span className="resource-row-name" title={fileName}>{fileName}</span>
      </div>

      <div style={{ width: 120 }}>
        {category ? (
          <span
            className="resource-row-category"
            style={{ background: `${category.color}15`, color: category.color }}
          >
            <i className={`fa-solid ${category.icon}`} />
            {category.name}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
        )}
      </div>

      <div style={{ width: 100, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        {formatFileSize(resource.file_size || 0)}
      </div>

      <div style={{ width: 100 }}>
        <span
          className="resource-row-visibility"
          style={{ color: visibility.color }}
        >
          <i className={`fa-solid ${visibility.icon}`} />
          {visibility.label}
        </span>
      </div>

      <div style={{ width: 110, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        {fmtDate(resource.created_at)}
      </div>

      <div style={{ width: 80, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="resource-row-action"
          onClick={handleDownload}
          title="다운로드"
        >
          <i className="fa-solid fa-download" />
        </button>
      </div>
    </div>
  );
}