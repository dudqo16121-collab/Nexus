// components/admin/AdminNoticesTab.jsx
// 사내 공지/팝업 관리 탭.

import { useState } from 'react';
import { useNoticePopup } from '../../contexts/NoticePopupContext';
import { useToast } from '../../contexts/ToastContext';
import NoticeEditorModal from './NoticeEditorModal';

const PRIORITY_META = {
  info:    { label: '안내',  icon: 'fa-circle-info',          color: '#4361ee' },
  warning: { label: '주의',  icon: 'fa-triangle-exclamation', color: '#f59e0b' },
  urgent:  { label: '긴급',  icon: 'fa-bullhorn',             color: '#ef4444' },
};

function fmtDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isActive(notice) {
  if (!notice.is_active) return false;
  const now = Date.now();
  if (notice.start_at && new Date(notice.start_at).getTime() > now) return false;
  if (notice.end_at && new Date(notice.end_at).getTime() < now) return false;
  return true;
}

export default function AdminNoticesTab() {
  const toast = useToast();
  const { allNotices, loading, updateNotice, deleteNotice, fetchNotices } = useNoticePopup();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const handleNew = () => {
    setEditTarget(null);
    setEditorOpen(true);
  };

  const handleEdit = (notice) => {
    setEditTarget(notice);
    setEditorOpen(true);
  };

  const handleDelete = async (notice) => {
    if (!confirm(`"${notice.title}" 공지를 삭제할까요?`)) return;
    const res = await deleteNotice(notice.id);
    if (res.ok) toast.success('공지가 삭제되었습니다.');
    else toast.error(res.error || '삭제 실패');
  };

  const handleToggleActive = async (notice) => {
    const res = await updateNotice(notice.id, { is_active: !notice.is_active });
    if (res.ok) toast.info(notice.is_active ? '비활성화되었습니다.' : '활성화되었습니다.');
    else toast.error(res.error || '실패');
  };

  return (
    <div style={{ color: 'var(--text-main)' }}>
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>
            <i className="fa-solid fa-bullhorn" style={{ color: 'var(--primary-color)', marginRight: 6 }} />
            사내 공지/팝업 관리
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            등록한 공지는 모든 사용자의 로그인 시 팝업으로 표시됩니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={fetchNotices}
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
            }}
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} /> 새로고침
          </button>
          <button
            type="button"
            className="btn btn-in"
            onClick={handleNew}
            style={{
              flex: 'none',
              width: 'auto',
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 8,
            }}
          >
            <i className="fa-solid fa-plus" /> 새 공지
          </button>
        </div>
      </div>

      {/* 공지 목록 */}
      {loading && allNotices.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
        </div>
      ) : allNotices.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: 'var(--bg-2)',
            borderRadius: 10,
            border: '1px dashed var(--border-color)',
          }}
        >
          <i className="fa-regular fa-bell" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12, opacity: 0.4 }} />
          <p style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>등록된 공지가 없어요.</p>
          <button
            type="button"
            onClick={handleNew}
            style={{
              background: 'var(--primary-color)',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            첫 공지 만들기
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allNotices.map((notice) => {
            const meta = PRIORITY_META[notice.priority] || PRIORITY_META.info;
            const active = isActive(notice);
            const color = notice.color || meta.color;

            return (
              <div
                key={notice.id}
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  opacity: active ? 1 : 0.55,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 11,
                    background: `${color}15`,
                    color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '1.05rem',
                  }}
                >
                  <i className={`fa-solid ${notice.icon || meta.icon}`} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span
                      style={{
                        background: color,
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {meta.label}
                    </span>
                    {active ? (
                      <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>
                        <i className="fa-solid fa-circle" style={{ fontSize: 7 }} /> 활성
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                        <i className="fa-solid fa-circle" style={{ fontSize: 7 }} /> 비활성
                      </span>
                    )}
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {notice.title}
                  </h4>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                    dangerouslySetInnerHTML={{ __html: notice.content }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>
                      <i className="fa-solid fa-user" /> {notice.created_by_name || '관리자'}
                    </span>
                    <span>·</span>
                    <span>
                      <i className="fa-solid fa-calendar" /> {fmtDateTime(notice.start_at)}
                      {notice.end_at && ` ~ ${fmtDateTime(notice.end_at)}`}
                    </span>
                    {notice.target_roles !== 'all' && (
                      <>
                        <span>·</span>
                        <span>
                          <i className="fa-solid fa-users" /> {notice.target_roles === 'admin' ? '관리자만' : '일반 사용자만'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    title={notice.is_active ? '비활성화' : '활성화'}
                    onClick={() => handleToggleActive(notice)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <i className={`fa-solid ${notice.is_active ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                  <button
                    type="button"
                    title="수정"
                    onClick={() => handleEdit(notice)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button
                    type="button"
                    title="삭제"
                    onClick={() => handleDelete(notice)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--danger)',
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 편집 모달 */}
      <NoticeEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        notice={editTarget}
      />
    </div>
  );
}