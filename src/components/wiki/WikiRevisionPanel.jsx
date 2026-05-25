// components/wiki/WikiRevisionPanel.jsx
// 수정 이력 사이드 패널 — 리비전 리스트 + 상세 + diff + 복원.

import { useEffect, useState, useMemo } from 'react';
import { useWiki } from '../../contexts/WikiContext';
import { useToast } from '../../contexts/ToastContext';

const CHANGE_TYPE_META = {
  create:  { label: '생성',  icon: 'fa-plus',           color: '#06d6a0' },
  update:  { label: '수정',  icon: 'fa-pen-to-square',  color: '#4361ee' },
  restore: { label: '복원',  icon: 'fa-clock-rotate-left', color: '#f59e0b' },
};

/* 간단한 라인 단위 diff (LCS 없이 빠른 비교) */
function simpleDiff(oldText, newText) {
  if (oldText === newText) return [];
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const result = [];
  const max = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    const o = oldLines[i] ?? '';
    const n = newLines[i] ?? '';
    if (o === n) {
      result.push({ type: 'same', line: o });
    } else {
      if (o) result.push({ type: 'removed', line: o });
      if (n) result.push({ type: 'added', line: n });
    }
  }
  return result;
}

/* HTML에서 텍스트만 추출 — diff 가독성 */
function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function WikiRevisionPanel({ open, onClose }) {
  const toast = useToast();
  const {
    currentDoc,
    fetchRevisions,
    fetchRevisionDetail,
    restoreRevision,
    canEdit,
  } = useWiki();

  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const editable = canEdit(currentDoc);

  /* 패널 열릴 때 리비전 목록 로드 */
  useEffect(() => {
    if (!open || !currentDoc?.id) {
      setRevisions([]);
      setSelectedId(null);
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchRevisions(currentDoc.id).then((rows) => {
      if (cancelled) return;
      setRevisions(rows);
      /* 가장 최신 리비전 자동 선택 */
      if (rows.length > 0) {
        setSelectedId(rows[0].id);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, currentDoc?.id, fetchRevisions]);

  /* 선택된 리비전 상세 로드 */
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetchRevisionDetail(selectedId).then((rev) => {
      if (!cancelled) {
        setDetail(rev);
        setDetailLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedId, fetchRevisionDetail]);

  /* diff — 선택 리비전 vs 현재 문서 */
  const diff = useMemo(() => {
    if (!detail || !currentDoc) return [];
    return simpleDiff(stripHtml(detail.content), stripHtml(currentDoc.content));
  }, [detail, currentDoc]);

  const handleRestore = async () => {
    if (!selectedId || !editable) return;
    if (!confirm('이 시점의 내용으로 복원할까요? 현재 내용은 이력에 보존됩니다.')) return;
    setRestoring(true);
    const res = await restoreRevision(selectedId);
    setRestoring(false);
    if (res.ok) {
      toast.success('복원되었어요. 이력에 새 항목이 추가되었습니다.');
      /* 리비전 목록 재로드 */
      const rows = await fetchRevisions(currentDoc.id);
      setRevisions(rows);
      if (rows.length > 0) setSelectedId(rows[0].id);
    } else {
      toast.error(res.error || '복원 실패');
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="wiki-rev-backdrop" onClick={onClose} />
      <aside className="wiki-rev-panel">
        <div className="wiki-rev-header">
          <h3>
            <i className="fa-solid fa-clock-rotate-left" />
            수정 이력
            {revisions.length > 0 && (
              <span className="wiki-rev-count">{revisions.length}</span>
            )}
          </h3>
          <button onClick={onClose} className="wiki-rev-close" title="닫기">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="wiki-rev-body">
          {/* 좌측 — 리비전 리스트 */}
          <div className="wiki-rev-list">
            {loading ? (
              <div className="wiki-rev-empty">
                <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
              </div>
            ) : revisions.length === 0 ? (
              <div className="wiki-rev-empty">
                <i className="fa-regular fa-clock" />
                <p>아직 이력이 없어요.</p>
              </div>
            ) : (
              revisions.map((rev) => {
                const meta = CHANGE_TYPE_META[rev.change_type] || CHANGE_TYPE_META.update;
                const active = selectedId === rev.id;
                return (
                  <button
                    key={rev.id}
                    type="button"
                    className={`wiki-rev-item ${active ? 'active' : ''}`}
                    onClick={() => setSelectedId(rev.id)}
                  >
                    <div
                      className="wiki-rev-item-icon"
                      style={{ background: `${meta.color}15`, color: meta.color }}
                    >
                      <i className={`fa-solid ${meta.icon}`} />
                    </div>
                    <div className="wiki-rev-item-body">
                      <div className="wiki-rev-item-top">
                        <span className="wiki-rev-item-no">#{rev.revision_no}</span>
                        <span
                          className="wiki-rev-item-type"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="wiki-rev-item-actor">
                        {rev.changed_by_name || '익명'}
                      </div>
                      <div className="wiki-rev-item-time" title={fmtDateTime(rev.created_at)}>
                        {timeAgo(rev.created_at)}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* 우측 — 상세 + diff */}
          <div className="wiki-rev-detail">
            {!detail && !detailLoading ? (
              <div className="wiki-rev-empty">
                <i className="fa-regular fa-clock" />
                <p>왼쪽에서 이력을 선택하세요.</p>
              </div>
            ) : detailLoading ? (
              <div className="wiki-rev-empty">
                <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
              </div>
            ) : (
              <>
                <div className="wiki-rev-detail-header">
                  <div>
                    <div className="wiki-rev-detail-title">
                      {detail.title || '제목 없음'}
                    </div>
                    <div className="wiki-rev-detail-meta">
                      #{detail.revision_no} · {detail.changed_by_name || '익명'} ·{' '}
                      {fmtDateTime(detail.created_at)}
                    </div>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      className="wiki-rev-restore-btn"
                      onClick={handleRestore}
                      disabled={restoring}
                    >
                      {restoring ? (
                        <><i className="fa-solid fa-spinner fa-spin" /> 복원 중...</>
                      ) : (
                        <><i className="fa-solid fa-rotate-left" /> 이 버전으로 복원</>
                      )}
                    </button>
                  )}
                </div>

                {/* Diff 보기 */}
                <div className="wiki-rev-diff">
                  <div className="wiki-rev-diff-title">
                    <i className="fa-solid fa-code-compare" /> 현재 버전과 비교
                  </div>
                  {diff.length === 0 ? (
                    <div className="wiki-rev-no-diff">
                      현재 버전과 동일한 내용입니다.
                    </div>
                  ) : (
                    <div className="wiki-rev-diff-lines">
                      {diff.map((d, i) => (
                        <div
                          key={i}
                          className={`wiki-rev-diff-line wiki-rev-diff-${d.type}`}
                        >
                          <span className="wiki-rev-diff-marker">
                            {d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' '}
                          </span>
                          <span className="wiki-rev-diff-text">
                            {d.line || '\u00A0'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 원본 내용 */}
                <details className="wiki-rev-raw">
                  <summary>이 시점의 원본 내용 보기</summary>
                  <div
                    className="wiki-rev-raw-content"
                    dangerouslySetInnerHTML={{ __html: detail.content || '' }}
                  />
                </details>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}