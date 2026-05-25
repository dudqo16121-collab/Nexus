// components/groupware/CoDocs.jsx
// 부서 공유 문서함 — 위키/자료실/즐겨찾기 통합 빠른 접근.
//
// 4개 탭:
//   - favorites: 북마크한 위키/자료
//   - mine:      내가 작성한 위키
//   - team:      같은 부서원이 작성한 위키
//   - recent:    최근 등록된 자료실 파일

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBookmark } from '../../contexts/BookmarkContext';
import { useOrgChart } from '../../contexts/OrgChartContext';

const TABS = [
  { value: 'favorites', label: '⭐ 즐겨찾기', icon: 'fa-star' },
  { value: 'mine',      label: '✍️ 내 문서',  icon: 'fa-pen' },
  { value: 'team',      label: '👥 부서 위키', icon: 'fa-users' },
  { value: 'recent',    label: '🆕 최근 자료', icon: 'fa-clock' },
];

/* 위키 카테고리별 아이콘/색 — wikiCategories와 동기화 */
const WIKI_CAT_META = {
  '전사':       { icon: 'fa-building',    color: '#4361ee' },
  '개발팀':     { icon: 'fa-code',        color: '#06d6a0' },
  '디자인팀':   { icon: 'fa-palette',     color: '#ec4899' },
  '인사팀':     { icon: 'fa-users',       color: '#f59e0b' },
  '운영가이드': { icon: 'fa-book-open',   color: '#8338ec' },
  '회의록':     { icon: 'fa-clipboard',   color: '#3aafa9' },
  '기타':       { icon: 'fa-folder',      color: '#6b7280' },
};

/* 파일 확장자별 아이콘 */
function fileIconOf(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['doc', 'docx'].includes(ext)) return { icon: 'fa-file-word', color: '#2b579a' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: '#06d6a0' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: 'fa-file-powerpoint', color: '#d04423' };
  if (['pdf'].includes(ext)) return { icon: 'fa-file-pdf', color: '#dc2626' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return { icon: 'fa-file-image', color: '#8338ec' };
  if (['zip', 'rar', '7z', 'tar'].includes(ext)) return { icon: 'fa-file-zipper', color: '#f59e0b' };
  if (['mp4', 'mov', 'avi'].includes(ext)) return { icon: 'fa-file-video', color: '#ec4899' };
  if (['mp3', 'wav', 'flac'].includes(ext)) return { icon: 'fa-file-audio', color: '#ec4899' };
  if (['txt', 'md'].includes(ext)) return { icon: 'fa-file-lines', color: '#6b7280' };
  return { icon: 'fa-file', color: '#6b7280' };
}

/* 파일 크기 포맷 — 1024 → 1KB, 1048576 → 1MB */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function CoDocs() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { bookmarks } = useBookmark();

  /* OrgChart로 user_id → 이름 매핑 (자료실 업로더 표시용).
     OrgChartProvider 밖에서 호출되면 에러나므로 try-catch 폴백. */
  let orgMembers = [];
  try {
    const oc = useOrgChart();
    orgMembers = oc?.members || [];
  } catch {
    orgMembers = [];
  }

  const [tab, setTab] = useState('favorites');
  const [myWikis, setMyWikis] = useState([]);
  const [teamWikis, setTeamWikis] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  /* 데이터 로드 */
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      /* 1) 내 위키 문서 (최근 10개) */
      const { data: mine } = await supabase
        .from('wiki_documents')
        .select('id, title, category, tags, author_name, updated_at')
        .eq('author_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      setMyWikis(mine || []);

      /* 2) 부서 위키 — 같은 부서원이 작성한 문서 (본인 제외) */
      const myDept = profile?.department;
      if (myDept) {
        const { data: deptUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('department', myDept)
          .neq('id', user.id);
        const deptUserIds = (deptUsers || []).map((u) => u.id);

        if (deptUserIds.length > 0) {
          const { data: team } = await supabase
            .from('wiki_documents')
            .select('id, title, category, tags, author_name, updated_at')
            .in('author_id', deptUserIds)
            .order('updated_at', { ascending: false })
            .limit(10);
          setTeamWikis(team || []);
        } else {
          setTeamWikis([]);
        }
      } else {
        setTeamWikis([]);
      }

      /* 3) 최근 자료실 파일 — 실제 스키마: id, file_name, file_size, file_url,
         storage_path, user_id, created_at */
      const { data: files } = await supabase
        .from('resources')
        .select('id, file_name, file_size, file_url, storage_path, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentFiles(files || []);
    } catch (e) {
      console.error('[CoDocs] loadData:', e);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* 즐겨찾기 — wiki/resource 종류만 필터 */
  const favorites = useMemo(() => {
    return bookmarks
      .filter((b) => ['wiki', 'resource', 'page'].includes(b.kind))
      .slice(0, 15);
  }, [bookmarks]);

  /* 현재 탭의 항목 수 */
  const counts = useMemo(() => ({
    favorites: favorites.length,
    mine: myWikis.length,
    team: teamWikis.length,
    recent: recentFiles.length,
  }), [favorites.length, myWikis.length, teamWikis.length, recentFiles.length]);

  /* 위키 카드 렌더 */
  const renderWikiCard = (doc) => {
    const meta = WIKI_CAT_META[doc.category] || WIKI_CAT_META['기타'];
    return (
      <div
        key={`wiki-${doc.id}`}
        className="codocs-card"
        onClick={() => navigate(`/wiki?doc=${doc.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate(`/wiki?doc=${doc.id}`);
        }}
      >
        <div
          className="codocs-card-icon"
          style={{ background: `${meta.color}15`, color: meta.color }}
        >
          <i className={`fa-solid ${meta.icon}`} />
        </div>
        <div className="codocs-card-body">
          <h4 className="codocs-card-title">{doc.title || '제목 없음'}</h4>
          <p className="codocs-card-meta">
            <span className="codocs-card-cat" style={{ color: meta.color }}>
              {doc.category || '기타'}
            </span>
            <span className="codocs-card-sep">·</span>
            <span>{doc.author_name || '익명'}</span>
            <span className="codocs-card-sep">·</span>
            <span>{timeAgo(doc.updated_at)}</span>
          </p>
          {doc.tags && doc.tags.length > 0 && (
            <div className="codocs-card-tags">
              {doc.tags.slice(0, 3).map((t) => (
                <span key={t} className="codocs-card-tag">#{t}</span>
              ))}
            </div>
          )}
        </div>
        <i className="fa-solid fa-arrow-right codocs-card-arrow" />
      </div>
    );
  };

  /* 자료실 파일 카드 렌더 */
  const renderFileCard = (file) => {
    const fi = fileIconOf(file.file_name);
    /* user_id → 업로더 이름 매핑 */
    const uploader = orgMembers.find((m) => m.id === file.user_id);
    const uploaderName = uploader?.full_name || '익명';
    /* 파일 크기 표시 */
    const sizeStr = formatFileSize(file.file_size);

    return (
      <div
        key={`file-${file.id}`}
        className="codocs-card"
        onClick={() => navigate('/resource')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate('/resource');
        }}
      >
        <div
          className="codocs-card-icon"
          style={{ background: `${fi.color}15`, color: fi.color }}
        >
          <i className={`fa-solid ${fi.icon}`} />
        </div>
        <div className="codocs-card-body">
          <h4 className="codocs-card-title">
            {file.file_name || '이름 없음'}
          </h4>
          <p className="codocs-card-meta">
            {sizeStr && (
              <>
                <span>{sizeStr}</span>
                <span className="codocs-card-sep">·</span>
              </>
            )}
            <span>{uploaderName}</span>
            <span className="codocs-card-sep">·</span>
            <span>{timeAgo(file.created_at)}</span>
          </p>
        </div>
        <i className="fa-solid fa-arrow-right codocs-card-arrow" />
      </div>
    );
  };

  /* 즐겨찾기 카드 렌더 — 종류에 따라 라우팅 */
  const renderBookmarkCard = (bm) => {
    const isWiki = bm.kind === 'wiki';
    const meta = isWiki
      ? (WIKI_CAT_META[bm.category] || { icon: 'fa-book', color: '#06d6a0' })
      : { icon: bm.icon || 'fa-bookmark', color: bm.color || '#fbbf24' };

    return (
      <div
        key={`bm-${bm.id}`}
        className="codocs-card"
        onClick={() => navigate(bm.link || '/')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate(bm.link || '/');
        }}
      >
        <div
          className="codocs-card-icon"
          style={{ background: `${meta.color}15`, color: meta.color }}
        >
          <i className={`fa-solid ${meta.icon}`} />
        </div>
        <div className="codocs-card-body">
          <h4 className="codocs-card-title">{bm.title}</h4>
          <p className="codocs-card-meta">
            <span className="codocs-card-cat" style={{ color: meta.color }}>
              {bm.kind === 'wiki' ? '위키' : bm.kind === 'resource' ? '자료실' : '페이지'}
            </span>
            {bm.subtitle && (
              <>
                <span className="codocs-card-sep">·</span>
                <span>{bm.subtitle}</span>
              </>
            )}
          </p>
        </div>
        <i className="fa-solid fa-arrow-right codocs-card-arrow" />
      </div>
    );
  };

  /* 탭별 콘텐츠 */
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="codocs-empty">
          <i className="fa-solid fa-spinner fa-spin" />
          <p>불러오는 중...</p>
        </div>
      );
    }

    switch (tab) {
      case 'favorites':
        if (favorites.length === 0) {
          return (
            <div className="codocs-empty">
              <i className="fa-regular fa-star" />
              <p>즐겨찾기한 문서가 없어요.</p>
              <p className="codocs-empty-sub">위키 문서에서 ⭐ 버튼을 눌러보세요.</p>
            </div>
          );
        }
        return favorites.map(renderBookmarkCard);

      case 'mine':
        if (myWikis.length === 0) {
          return (
            <div className="codocs-empty">
              <i className="fa-regular fa-file-lines" />
              <p>아직 작성한 위키 문서가 없어요.</p>
              <button
                className="codocs-empty-btn"
                onClick={() => navigate('/wiki')}
              >
                위키로 가기
              </button>
            </div>
          );
        }
        return myWikis.map(renderWikiCard);

      case 'team':
        if (!profile?.department) {
          return (
            <div className="codocs-empty">
              <i className="fa-regular fa-circle-question" />
              <p>부서 정보가 없어요.</p>
              <p className="codocs-empty-sub">프로필에서 부서를 설정해주세요.</p>
            </div>
          );
        }
        if (teamWikis.length === 0) {
          return (
            <div className="codocs-empty">
              <i className="fa-regular fa-folder-open" />
              <p>{profile.department} 부서원의 위키 문서가 없어요.</p>
            </div>
          );
        }
        return teamWikis.map(renderWikiCard);

      case 'recent':
        if (recentFiles.length === 0) {
          return (
            <div className="codocs-empty">
              <i className="fa-regular fa-folder-open" />
              <p>최근 등록된 자료가 없어요.</p>
              <button
                className="codocs-empty-btn"
                onClick={() => navigate('/resource')}
              >
                자료실로 가기
              </button>
            </div>
          );
        }
        return recentFiles.map(renderFileCard);

      default:
        return null;
    }
  };

  return (
    <div className="bento-card card-co-docs">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-folder-open" style={{ color: '#9d4edd' }} />
          공유 문서함
        </h3>
        <button
          className="codocs-new-btn"
          onClick={() => navigate('/wiki')}
          title="위키로 가기"
        >
          <i className="fa-solid fa-plus" /> 새 문서
        </button>
      </div>

      {/* 탭 */}
      <div className="codocs-tabs">
        {TABS.map((t) => {
          const cnt = counts[t.value];
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              className={`codocs-tab ${active ? 'active' : ''}`}
              onClick={() => setTab(t.value)}
            >
              <span>{t.label}</span>
              {cnt > 0 && <span className="codocs-tab-count">{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* 콘텐츠 */}
      <div className="codocs-content">
        {renderTabContent()}
      </div>
    </div>
  );
}