// src/components/project/situation/SituationWorkload.jsx
// 담당자별 할당 카드 수 + 진행률 — 누가 얼마나 짊어지고 있는지.

import { assigneeAvatar } from '../../../utils/projectHelpers';

export default function SituationWorkload({ tasks, members, loading }) {
  /* 멤버별 집계 */
  const byUser = new Map(); // id -> { user, total, done }

  /* 멤버 먼저 등록 (할당 없어도 표시) */
  members.forEach((m) => {
    byUser.set(m.id || m.user_id, {
      user: {
        id: m.id || m.user_id,
        name: m.full_name || m.name || '익명',
        avatar_url: m.avatar_url,
      },
      total: 0,
      done: 0,
    });
  });

  /* 태스크 집계 */
  tasks.forEach((t) => {
    if (!t.assignee_id) return;
    if (!byUser.has(t.assignee_id)) {
      /* 멤버 목록에 없는 외부 담당자도 추가 */
      byUser.set(t.assignee_id, {
        user: { id: t.assignee_id, name: '외부', avatar_url: null },
        total: 0, done: 0,
      });
    }
    const row = byUser.get(t.assignee_id);
    row.total += 1;
    if (t.status === 'done') row.done += 1;
  });

  /* 정렬 — 할당 많은 순 */
  const rows = [...byUser.values()].sort((a, b) => b.total - a.total);

  return (
    <div className="psr-widget">
      <div className="psr-widget-head">
        <h4>
          <i className="fa-solid fa-users-gear" style={{ color: '#8338ec' }} />
          멤버별 워크로드
        </h4>
        <span className="psr-widget-meta">{rows.length}명</span>
      </div>

      {loading ? (
        <div className="psr-empty">
          <i className="fa-solid fa-spinner fa-spin" />
          <p>멤버 정보 로드 중…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="psr-empty">
          <i className="fa-regular fa-user" />
          <p>아직 멤버나 담당자 지정이 없어요</p>
        </div>
      ) : (
        <ul className="psr-workload-list">
          {rows.map((row) => {
            const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
            return (
              <li key={row.user.id} className="psr-workload-item">
                <div
                  className="psr-workload-avatar"
                  style={{ backgroundImage: `url('${assigneeAvatar(row.user)}')` }}
                  title={row.user.name}
                />
                <div className="psr-workload-body">
                  <div className="psr-workload-line1">
                    <span className="psr-workload-name">{row.user.name}</span>
                    <span className="psr-workload-count">
                      {row.done}/{row.total}
                    </span>
                  </div>
                  <div className="psr-workload-bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="psr-workload-pct">{pct}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}