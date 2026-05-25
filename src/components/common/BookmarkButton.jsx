// components/common/BookmarkButton.jsx
// 어디든 한 줄로 ⭐ 버튼 추가.
//
// 사용:
//   <BookmarkButton
//     kind="post"
//     refId={post.id}
//     title={post.title}
//     subtitle={post.author_name}
//     link={`/board?post=${post.id}`}
//   />

import { useBookmark } from '../../contexts/BookmarkContext';
import { useToast } from '../../contexts/ToastContext';

export default function BookmarkButton({
  kind,
  refId,
  title,
  subtitle,
  link,
  icon,
  color,
  size = 'md',            // 'sm' | 'md' | 'lg'
  variant = 'icon',       // 'icon' | 'pill'
  showLabel = false,      // pill 일 때 사용
  className = '',
}) {
  const { isBookmarked, toggleBookmark } = useBookmark();
  const toast = useToast();

  const bookmarked = isBookmarked(kind, refId);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await toggleBookmark({
      kind, refId, title, subtitle, link, icon, color,
    });
    if (!res.ok) {
      toast.error(res.error || '실패');
      return;
    }
    if (res.added) toast.success('즐겨찾기에 추가했어요');
    else if (res.removed) toast.info('즐겨찾기에서 제거했어요');
  };

  const sizeClass = `bookmark-btn-${size}`;
  const variantClass = `bookmark-btn-${variant}`;
  const activeClass = bookmarked ? 'is-bookmarked' : '';

  return (
    <button
      type="button"
      className={`bookmark-btn ${sizeClass} ${variantClass} ${activeClass} ${className}`}
      onClick={handleClick}
      title={bookmarked ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
      aria-pressed={bookmarked}
    >
      <i className={bookmarked ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
      {showLabel && (
        <span>{bookmarked ? '즐겨찾기됨' : '즐겨찾기'}</span>
      )}
    </button>
  );
}