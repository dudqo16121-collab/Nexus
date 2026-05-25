// components/groupware/ActionCenter.jsx
// 통합 액션 인박스 — 내가 처리해야 할 모든 작업을 한 곳에.
//
// 데이터 통합:
//  1) 안 읽은 알림 (notifications.read_at is null)
//  2) 결재 대기 (approvals 에서 현재 결재자가 나)
//  3) 할당된 미완료 태스크 (tasks.assignee_id = me, status != done)
//
// 클릭 시 해당 페이지로 라우팅. 알림은 자동으로 읽음 처리.

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification, NOTIF_TYPES } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';

const FILTERS = [
  { value: 'all',      label: '전체',     icon: 'fa-inbox' },
  { value: 'approval', label: '결재',     icon: 'fa-stamp' },
  { value: 'mention',  label: '멘션',     icon: 'fa-at' },
  { value: 'task',     label: '태스크',   icon: 'fa-list-check' },
  { value: 'other',    label: '기타',     icon: 'fa-bell' },
];

/* 상대 시간 */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

/* D-Day */
function dDay(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due - today) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return { label: 'D-Day', urgent: true };
  if (diffDays === 1) return { label: 'D-1', urgent: true };
  if (diffDays < 0) return { label: `D+${-diffDays}`, urgent: true, overdue: true };
  if (diffDays <= 7) return { label: `D-${diffDays}`, urgent: false };
  return { label: `D-${diffDays}`, urgent: false, dim: true };
}

export default function ActionCenter() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { items: notifs, markAsRead, fetchNotifications } = useNotification();

  const [approvals, setApprovals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  /* 결재 대기 + 할당 태스크 로드 */
  const loadExtra = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      /* 1) 결재 대기 — 현재 결재자가 나, status가 in_progress 또는 pending */
      const { data: appData } = await supabase
        .from('approvals')
        .select('id, title, type, drafter_name, drafter_id, current_step, approvers, status, created_at')
        .in('status', ['in_progress', 'pending'])
        .order('created_at', { ascending: false });

      const myApprovals = (appData || []).filter((doc) => {
        const apvs = doc.approvers || [];
        const step = doc.current_step || 0;
        return apvs[step]?.id === user.id && apvs[step]?.status !== 'approved' && apvs[step]?.status !== 'rejected';
      });
      setApprovals(myApprovals);

      /* 2) 내게 할당된 미완료 태스크 */
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, project_id, created_at')
        .eq('assignee_id', user.id)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20);
      setTasks(taskData || []);
    } catch (e) {
      console.error('[ActionCenter] loadExtra:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadExtra();
    /* 1분마다 재로드 — 결재/태스크 상태 변경 반영 */
    const t = setInterval(loadExtra, 60_000);
    return () => clearInterval(t);
  }, [loadExtra]);

  /* 통합 아이템 빌드 */
  const items = useMemo(() => {
    const out = [];

    /* 결재 대기 */
    approvals.forEach((doc) => {
      out.push({
        id: `approval-${doc.id}`,
        kind: 'approval',
        title: `[결재 요청] ${doc.title}`,
        desc: `${doc.drafter_name || '직원'}님이 ${doc.type || '결재'} 승인을 요청했습니다.`,
        icon: 'fa-stamp',
        color: '#f72585',
        tag: '결재 요망',
        tagClass: 'tag-req',
        time: doc.created_at,
        priority: 0, // 결재가 최우선
        btnText: '검토하기',
        link: '/approval',
        refId: doc.id,
      });
    });

    /* 할당된 태스크 */
    tasks.forEach((t) => {
      const dd = dDay(t.due_date);
      const isUrgent = t.priority === 'high' || dd?.urgent;
      out.push({
        id: `task-${t.id}`,
        kind: 'task',
        title: `[태스크] ${t.title}`,
        desc: dd
          ? `${dd.label} ${dd.overdue ? '(지났어요)' : dd.urgent ? '— 마감 임박!' : ''}`
          : '담당으로 지정된 태스크입니다.',
        icon: 'fa-list-check',
        color: isUrgent ? '#ef4444' : '#8338ec',
        tag: dd?.urgent ? (dd.overdue ? '지연' : '긴급') : '태스크',
        tagClass: dd?.urgent ? 'tag-req' : 'tag-review',
        time: t.created_at,
        priority: isUrgent ? 1 : 3,
        btnText: '확인하기',
        link: `/project?id=${t.project_id}&task=${t.id}`,
        refId: t.id,
      });
    });

    /* 안 읽은 알림 */
    notifs
      .filter((n) => !n.read_at)
      .forEach((n) => {
        const meta = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
        out.push({
          id: `notif-${n.id}`,
          kind: n.type === 'mention' ? 'mention' : (n.type === 'approval' ? 'approval' : 'other'),
          title: n.title || meta.label,
          desc: n.body || '',
          icon: n.icon || meta.icon,
          color: n.color || meta.color,
          tag: meta.label,
          tagClass:
            n.type === 'mention' ? 'tag-mention' :
            n.type === 'approval' ? 'tag-req' :
            'tag-review',
          time: n.created_at,
          priority: n.type === 'mention' ? 2 : 4,
          btnText: '확인하기',
          link: n.link || '/',
          refId: n.id,
          notifId: n.id,
        });
      });

    /* 정렬: priority 오름차순 (낮은 = 더 중요), 같으면 최신순 */
    out.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(b.time) - new Date(a.time);
    });

    return out;
  }, [approvals, tasks, notifs]);

  /* 필터링 */
  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.kind === filter);
  }, [items, filter]);

  /* 카운트 (필터 배지용) */
  const counts = useMemo(() => {
    const c = { all: items.length };
    items.forEach((i) => { c[i.kind] = (c[i.kind] || 0) + 1; });
    return c;
  }, [items]);

  /* 아이템 클릭 — 해당 페이지로 이동 + 알림이면 읽음 처리 */
  const handleClick = async (item) => {
    if (item.notifId) {
      await markAsRead(item.notifId);
    }
    if (item.link) navigate(item.link);
  };

  /* 모두 읽음 — 알림만 처리 (결재/태스크는 그대로) */
  const handleMarkAllRead = async () => {
    const unread = notifs.filter((n) => !n.read_at);
    if (unread.length === 0) {
      toast.info('읽지 않은 알림이 없어요.');
      return;
    }
    for (const n of unread) {
      await markAsRead(n.id);
    }
    toast.success(`${unread.length}개의 알림을 읽음 처리했어요.`);
  };

  /* 새로고침 */
  const handleRefresh = () => {
    fetchNotifications();
    loadExtra();
  };

  return (
    <div className="bento-card card-action-center">
      <div className="bento-header">
        <h3>
          <i className="fa-solid fa-inbox" style={{ color: 'var(--primary-color)' }} />
          나의 액션 아이템
          {filtered.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: '0.78rem',
                background: 'var(--primary-color)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              {filtered.length}
            </span>
          )}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleRefresh}
            title="새로고침"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              fontSize: '0.85rem',
            }}
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
          </button>
          <span
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={handleMarkAllRead}
          >
            모두 읽음
          </span>
        </div>
      </div>

      {/* 필터 칩 */}
      <div className="action-filters">
        {FILTERS.map((f) => {
          const cnt = counts[f.value] || 0;
          const active = filter === f.value;
          if (f.value !== 'all' && cnt === 0) return null;
          return (
            <button
              key={f.value}
              type="button"
              className={`action-chip ${active ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              <i className={`fa-solid ${f.icon}`} />
              {f.label}
              {cnt > 0 && <span className="action-chip-count">{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* 리스트 */}
      <div style={{ overflowY: 'auto', flex: 1, paddingRight: 5 }}>
        {loading && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <i
              className="fa-solid fa-mug-hot"
              style={{ fontSize: '2rem', marginBottom: 10, display: 'block', opacity: 0.5 }}
            />
            {filter === 'all'
              ? '처리해야 할 업무가 없어요. 잠시 한숨 돌리세요 ☕'
              : '이 카테고리에 처리할 항목이 없어요.'}
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="action-item"
              onClick={() => handleClick(item)}
              style={{ cursor: 'pointer' }}
            >
              <div
                className="action-icon"
                style={{ background: `${item.color}15`, color: item.color }}
              >
                <i className={`fa-solid ${item.icon}`} />
              </div>
              <div className="action-content">
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
                <div className="action-meta">
                  <span className={item.tagClass}>{item.tag}</span>
                  <span>{timeAgo(item.time)}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(item);
                }}
                style={{
                  background:
                    item.kind === 'approval' ? 'var(--primary-color)' : 'var(--bg-2)',
                  color: item.kind === 'approval' ? '#fff' : 'var(--text-main)',
                  border:
                    item.kind === 'approval' ? 'none' : '1px solid var(--border-color)',
                  padding: '8px 15px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  fontSize: '0.82rem',
                }}
              >
                {item.btnText}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}