// 조직도 트리 뷰 — 부서별 계층 표시.

import { useState } from 'react';
import { useOrgChart } from '../../contexts/OrgChartContext';

function avatarUrl(m) {
  if (m?.avatar_url) return m.avatar_url;
  return `https://i.pravatar.cc/150?u=${m?.id || 'x'}`;
}

export default function OrgChartTree() {
  const { departments, filteredMembers, openDetail, members, search, quickFilter, selectedDept } = useOrgChart();

  /* 펼침 상태 — 기본은 모두 펼침 */
  const [expanded, setExpanded] = useState(() => {
    const init = {};
    departments.forEach((d) => { init[d.name] = true; });
    return init;
  });

  const toggleDept = (deptName) => {
    setExpanded((prev) => ({ ...prev, [deptName]: !prev[deptName] }));
  };

  /* 필터/검색 적용된 멤버 ID 집합 — 트리에서도 필터 반영 */
  const visibleIds = new Set(filteredMembers.map((m) => m.id));

  /* 트리에 표시할 부서 — 필터 적용된 멤버가 있는 부서만 */
  const visibleDepts = departments
    .map((d) => ({
      ...d,
      visibleMembers: d.members.filter((m) => visibleIds.has(m.id)),
    }))
    .filter((d) => d.visibleMembers.length > 0);

  const hasFilter = !!search || !!quickFilter || !!selectedDept;

  return (
    <div className="org-tree-wrap">
      {/* 회사 노드 */}
      <div className="org-tree-root">
        <div className="org-tree-root-node">
          <i className="fa-solid fa-building" />
          <span>전체 조직</span>
          <strong>{members.length}명</strong>
        </div>
      </div>

      {/* 부서 노드들 */}
      {visibleDepts.length === 0 ? (
        <div className="org-tree-empty">
          <i className="fa-regular fa-folder-open" />
          <p>표시할 부서가 없어요</p>
        </div>
      ) : (
        <div className="org-tree-deps">
          {visibleDepts.map((d) => {
            const isOpen = expanded[d.name] !== false;
            return (
              <div
                key={d.name}
                className="org-tree-dept"
                style={{ '--dept-color': d.color }}
              >
                {/* 부서 헤더 */}
                <button
                  type="button"
                  className="org-tree-dept-head"
                  onClick={() => toggleDept(d.name)}
                >
                  <div className="org-tree-dept-info">
                    <span
                      className="org-tree-dept-icon"
                      style={{
                        background: `${d.color}15`,
                        color: d.color,
                      }}
                    >
                      <i className={`fa-solid ${d.icon}`} />
                    </span>
                    <div className="org-tree-dept-text">
                      <strong className="org-tree-dept-name">{d.name}</strong>
                      <span className="org-tree-dept-count">
                        {d.visibleMembers.length}명
                        {hasFilter && d.visibleMembers.length !== d.members.length && (
                          <span className="org-tree-dept-total"> / {d.members.length}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 미니 아바타 미리보기 (최대 4개) */}
                  <div className="org-tree-dept-preview">
                    {d.visibleMembers.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        className="org-tree-preview-avatar"
                        style={{ backgroundImage: `url('${avatarUrl(m)}')` }}
                        title={m.full_name}
                      />
                    ))}
                    {d.visibleMembers.length > 4 && (
                      <div className="org-tree-preview-more">
                        +{d.visibleMembers.length - 4}
                      </div>
                    )}
                  </div>

                  <i
                    className={`fa-solid fa-chevron-down org-tree-chev ${isOpen ? 'open' : ''}`}
                  />
                </button>

                {/* 멤버 리스트 */}
                {isOpen && (
                  <div className="org-tree-members">
                    {d.visibleMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="org-tree-member"
                        onClick={() => openDetail(m)}
                      >
                        <div
                          className="org-tree-member-avatar"
                          style={{ backgroundImage: `url('${avatarUrl(m)}')` }}
                        />
                        <div className="org-tree-member-info">
                          <span className="org-tree-member-name">
                            {m.full_name || '이름 없음'}
                            {m.is_admin && (
                              <i
                                className="fa-solid fa-crown"
                                style={{ color: '#fbbf24', marginLeft: 4, fontSize: '0.7rem' }}
                              />
                            )}
                          </span>
                          {m.position && (
                            <span className="org-tree-member-position">{m.position}</span>
                          )}
                        </div>
                        {m.status_msg && (
                          <span className="org-tree-member-status" title={m.status_msg}>
                            <i className="fa-regular fa-comment-dots" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}