// pages/SystemLogs.jsx
// 관리자 전용 시스템 로그 페이지.
// 라우트: /admin/logs (관리자만 접근)

import { useState } from 'react';
import {
  useSystemLog,
  LOG_CATEGORIES,
  LOG_LEVELS,
} from '../contexts/SystemLogContext';
import { useToast } from '../contexts/ToastContext';
import { SkeletonTable } from '../components/common/Skeleton';

/* 시간 포맷 */
function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '방금';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

export default function SystemLogs() {
  const toast = useToast();
  const {
    logs,
    loading,
    filters,
    setFilters,
    fetchLogs,
    deleteLog,
    clearLogs,
    stats,
    isAdmin,
  } = useSystemLog();

  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(0);

  if (!isAdmin) {
    return (
      <section style={{ padding: 40, textAlign: 'center' }}>
        <i
          className="fa-solid fa-lock"
          style={{ fontSize: '3rem', color: 'var(--text-muted)', opacity: 0.5 }}
        />
        <h3 style={{ marginTop: 20 }}>관리자 권한이 필요한 페이지입니다.</h3>
      </section>
    );
  }

  const handleDelete = async (id) => {
    if (!confirm('이 로그를 삭제할까요?')) return;
    const res = await deleteLog(id);
    if (res.ok) {
      toast.info('로그가 삭제되었습니다.');
      if (selectedLog?.id === id) setSelectedLog(null);
    } else {
      toast.error(res.error || '삭제 실패');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('모든 시스템 로그를 삭제할까요? 되돌릴 수 없습니다.')) return;
    const res = await clearLogs();
    if (res.ok) {
      toast.info('모든 로그가 삭제되었습니다.');
      setSelectedLog(null);
    } else {
      toast.error(res.error || '삭제 실패');
    }
  };

  const handleRefresh = () => {
    setPage(0);
    fetchLogs(0);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchLogs(next);
  };

  return (
    <section id="view-system-logs" style={{ padding: '24px 28px' }}>
      {/* 헤더 */}
      <header style={{ marginBottom: 22 }}>
        <h2
          style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: 0,
          }}
        >
          <i className="fa-solid fa-bug" style={{ color: '#8338ec' }} />
          시스템 로그
        </h2>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.92rem',
            margin: '6px 0 0',
          }}
        >
          시스템 이벤트, 사용자 활동, 보안 이벤트를 실시간으로 모니터링합니다.
        </p>
      </header>

      {/* 통계 카드 */}
      <div className="syslog-stats">
        <div className="syslog-stat-card">
          <div className="syslog-stat-icon" style={{ background: 'rgba(67,97,238,0.12)', color: '#4361ee' }}>
            <i className="fa-solid fa-database" />
          </div>
          <div>
            <div className="syslog-stat-value">{stats.total}</div>
            <div className="syslog-stat-label">표시된 로그</div>
          </div>
        </div>
        <div className="syslog-stat-card">
          <div className="syslog-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
            <i className="fa-solid fa-circle-info" />
          </div>
          <div>
            <div className="syslog-stat-value">{stats.info}</div>
            <div className="syslog-stat-label">정보</div>
          </div>
        </div>
        <div className="syslog-stat-card">
          <div className="syslog-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <div>
            <div className="syslog-stat-value">{stats.warn}</div>
            <div className="syslog-stat-label">경고</div>
          </div>
        </div>
        <div className="syslog-stat-card">
          <div className="syslog-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
            <i className="fa-solid fa-circle-xmark" />
          </div>
          <div>
            <div className="syslog-stat-value">{stats.error + stats.critical}</div>
            <div className="syslog-stat-label">오류/심각</div>
          </div>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="syslog-filters">
        <div className="syslog-filter-group">
          <label>레벨</label>
          <select
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          >
            <option value="all">전체</option>
            {Object.entries(LOG_LEVELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="syslog-filter-group">
          <label>카테고리</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            {LOG_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="syslog-filter-group" style={{ flex: 1, minWidth: 200 }}>
          <label>검색</label>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            placeholder="메시지 검색..."
          />
        </div>
        <div className="syslog-filter-actions">
          <button onClick={handleRefresh} title="새로고침" className="syslog-icon-btn">
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
          </button>
          <button
            onClick={handleClearAll}
            title="모두 삭제"
            className="syslog-icon-btn syslog-icon-btn-danger"
          >
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      </div>

      {/* 로그 테이블 */}
      <div className="syslog-table-wrap">
        {loading && logs.length === 0 ? (
          <SkeletonTable rows={8} cols={5} />
        ) : logs.length === 0 ? (
          <div className="syslog-empty">
            <i className="fa-regular fa-folder-open" />
            <p>로그가 없습니다.</p>
          </div>
        ) : (
          <table className="syslog-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>레벨</th>
                <th style={{ width: 110 }}>카테고리</th>
                <th>메시지</th>
                <th style={{ width: 140 }}>행위자</th>
                <th style={{ width: 150 }}>시각</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const lvl = LOG_LEVELS[log.level] || LOG_LEVELS.info;
                const cat = LOG_CATEGORIES.find((c) => c.value === log.category) || {};
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`syslog-row syslog-row-${log.level}`}
                  >
                    <td>
                      <span
                        className="syslog-level-badge"
                        style={{
                          background: `${lvl.color}20`,
                          color: lvl.color,
                        }}
                      >
                        <i className={`fa-solid ${lvl.icon}`} />
                        {lvl.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: cat.color || 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                        {cat.icon && <i className={`fa-solid ${cat.icon}`} style={{ marginRight: 5 }} />}
                        {cat.label || log.category}
                      </span>
                    </td>
                    <td className="syslog-msg">{log.message}</td>
                    <td className="syslog-actor">{log.actor_name || '시스템'}</td>
                    <td className="syslog-time" title={formatTime(log.created_at)}>
                      {relTime(log.created_at)}
                    </td>
                    <td>
                      <button
                        className="syslog-del-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(log.id);
                        }}
                        title="삭제"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 더보기 */}
        {logs.length > 0 && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <button
              className="syslog-more-btn"
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" /> 불러오는 중</>
              ) : (
                <>더 보기</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 로그 상세 모달 */}
      {selectedLog && (
        <div className="syslog-detail-overlay" onClick={() => setSelectedLog(null)}>
          <div className="syslog-detail" onClick={(e) => e.stopPropagation()}>
            <div className="syslog-detail-header">
              <h3>로그 상세</h3>
              <button onClick={() => setSelectedLog(null)} className="syslog-icon-btn">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="syslog-detail-body">
              <div className="syslog-detail-row">
                <label>레벨</label>
                <span>{LOG_LEVELS[selectedLog.level]?.label || selectedLog.level}</span>
              </div>
              <div className="syslog-detail-row">
                <label>카테고리</label>
                <span>{LOG_CATEGORIES.find((c) => c.value === selectedLog.category)?.label || selectedLog.category}</span>
              </div>
              <div className="syslog-detail-row">
                <label>메시지</label>
                <span>{selectedLog.message}</span>
              </div>
              <div className="syslog-detail-row">
                <label>행위자</label>
                <span>{selectedLog.actor_name || '시스템'}</span>
              </div>
              <div className="syslog-detail-row">
                <label>시각</label>
                <span>{formatTime(selectedLog.created_at)}</span>
              </div>
              {selectedLog.ref_type && (
                <div className="syslog-detail-row">
                  <label>참조</label>
                  <span>{selectedLog.ref_type} #{selectedLog.ref_id}</span>
                </div>
              )}
              {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                <div className="syslog-detail-row">
                  <label>메타데이터</label>
                  <pre className="syslog-detail-meta">
                    {JSON.stringify(selectedLog.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}