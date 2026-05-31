// 그리드 모드 파일 카드 — 새 디자인.

import { useResource, VISIBILITY_LABELS } from '../../contexts/ResourceContext';
import { useToast } from '../../contexts/ToastContext';
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

export default function ResourceFileCard({ resource }) {
  const toast = useToast();
  const {
    categories, openDetail, toggleFavorite, isFavorite, recordView,
  } = useResource();

  const fileName = resource.file_name || '파일';
  const category = categories.find((c) => c.id === resource.category_id);
  const isFav = isFavorite(resource.id);
  const visibility = VISIBILITY_LABELS[resource.visibility] || VISIBILITY_LABELS.public;
  const showThumbnail = isImage(fileName) && resource.file_url;

  const handleCardClick = () => {
    recordView(resource.id, 'view');
    openDetail(resource);
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    const res = await toggleFavorite(resource.id);
    if (!res.ok) toast.error(res.error || '실패');
  };

  return (
    <div className="resource-card" onClick={handleCardClick}>
      {/* 즐겨찾기 별 */}
      <button
        type="button"
        className={`resource-card-fav ${isFav ? 'active' : ''}`}
        onClick={handleFavoriteClick}
        title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
      >
        <i className={`fa-${isFav ? 'solid' : 'regular'} fa-star`} />
      </button>

      {/* 카테고리 태그 */}
      {category && (
        <div
          className="resource-card-category"
          style={{ background: category.color }}
        >
          <i className={`fa-solid ${category.icon}`} />
          {category.name}
        </div>
      )}

      {/* 미리보기 / 아이콘 */}
      <div className="resource-card-preview">
        {showThumbnail ? (
          <img
            src={resource.file_url}
            alt={fileName}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <i
            className={`fa-solid ${getFileIcon(fileName)}`}
            style={{ color: iconColor(fileName) }}
          />
        )}
      </div>

      {/* 정보 */}
      <div className="resource-card-info">
        <h4 title={fileName}>{fileName}</h4>
        <div className="resource-card-meta">
          <span>{formatFileSize(resource.file_size || 0)}</span>
          <span
            className="resource-card-visibility"
            style={{ color: visibility.color }}
            title={visibility.label}
          >
            <i className={`fa-solid ${visibility.icon}`} />
          </span>
        </div>
      </div>
    </div>
  );
}