// 조직도 우측 — 직원 카드 그리드. 검색 결과/선택 부서 필터 반영.

import { useOrgChart } from '../../contexts/OrgChartContext';
import { SkeletonCardGrid } from '../common/Skeleton';

function avatarUrl(m) {
  if (m?.avatar_url) return m.avatar_url;
  return `https://i.pravatar.cc/150?u=${m?.id || 'x'}`;
}

export default function OrgChartGrid() {
  const { filteredMembers, loading, openDetail, search, selectedDept } = useOrgChart();

  if (loading) {
    return <SkeletonCardGrid count={8} minWidth={200} />;
  }

  if (filteredMembers.length === 0) {
    return (
      <div className="org-grid-empty">
        <i className="fa-regular fa-face-frown" />
        <p>
          {search ? (
            <>"<strong>{search}</strong>" 검색 결과가 없어요</>
          ) : selectedDept ? (
            <>"<strong>{selectedDept}</strong>" 부서에 직원이 없어요</>
          ) : (
            '등록된 직원이 없어요'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="org-grid">
      {filteredMembers.map((m) => (
        <button
          key={m.id}
          type="button"
          className="org-card"
          onClick={() => openDetail(m)}
        >
          <div
            className="org-card-avatar"
            style={{ backgroundImage: `url('${avatarUrl(m)}')` }}
          />
          <div className="org-card-name">
            {m.full_name || '이름 없음'}
            {m.is_admin && (
              <span className="org-card-badge" title="관리자">
                <i className="fa-solid fa-shield-halved" />
              </span>
            )}
          </div>
          <div className="org-card-dept">{m.department || '미지정'}</div>
          {m.status_msg && (
            <div className="org-card-status" title={m.status_msg}>
              "{m.status_msg}"
            </div>
          )}
        </button>
      ))}
    </div>
  );
}