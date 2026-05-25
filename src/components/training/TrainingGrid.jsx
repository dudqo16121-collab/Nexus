// 과정 카드 그리드.

import { useTraining, CATEGORIES, STATUS_META } from '../../contexts/TrainingContext';
import { SkeletonCardGrid } from '../common/Skeleton';

function fmtPeriod(start, end) {
  if (!start && !end) return '일정 미정';
  const s = start ? new Date(start).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '?';
  const e = end ? new Date(end).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '?';
  if (start === end) return s;
  return `${s} ~ ${e}`;
}

export default function TrainingGrid() {
  const {
    visibleCourses,
    loading,
    openDetail,
    getMyEnrollment,
    allEnrollments,
    isAdmin,
    filter,
  } = useTraining();

  if (loading) {
    return <SkeletonCardGrid count={6} minWidth={280} />;
  }
  
  if (visibleCourses.length === 0) {
    return (
      <div className="training-empty">
        <i className="fa-regular fa-folder-open" />
        <p>
          {filter === 'mine' ? '신청 내역이 없어요' : '조건에 맞는 과정이 없어요'}
        </p>
      </div>
    );
  }

  return (
    <div className="training-grid">
      {visibleCourses.map((c) => {
        const cat = CATEGORIES.find((x) => x.id === c.category) || CATEGORIES[5];
        const my = getMyEnrollment(c.id);
        const enrollCount = allEnrollments.filter(
          (e) => e.course_id === c.id && (e.status === 'approved' || e.status === 'pending' || e.status === 'completed')
        ).length;

        return (
          <button
            key={c.id}
            type="button"
            className="training-card"
            onClick={() => openDetail(c.id)}
          >
            <div className="training-card-header" style={{ background: `${cat.color}10` }}>
              <div className="training-card-cat" style={{ color: cat.color }}>
                <i className={`fa-solid ${cat.icon}`} /> {cat.label}
              </div>
              {c.status !== 'open' && (
                <span className="training-card-closed">
                  {c.status === 'closed' ? '마감' : '보관'}
                </span>
              )}
            </div>

            <div className="training-card-body">
              <h3 className="training-card-title">{c.title}</h3>
              {c.description && (
                <p className="training-card-desc">{c.description}</p>
              )}

              <div className="training-card-meta">
                {c.instructor && (
                  <div><i className="fa-solid fa-user-tie" /> {c.instructor}</div>
                )}
                <div><i className="fa-regular fa-calendar" /> {fmtPeriod(c.start_date, c.end_date)}</div>
                {c.location && (
                  <div><i className="fa-solid fa-location-dot" /> {c.location}</div>
                )}
                {isAdmin && (
                  <div><i className="fa-solid fa-users" /> {enrollCount} / {c.capacity}명</div>
                )}
              </div>
            </div>

            <div className="training-card-footer">
              {my ? (
                <span
                  className="training-card-status"
                  style={{
                    background: `${STATUS_META[my.status].color}15`,
                    color: STATUS_META[my.status].color,
                  }}
                >
                  <i className={`fa-solid ${STATUS_META[my.status].icon}`} />
                  {STATUS_META[my.status].label}
                </span>
              ) : c.status === 'open' ? (
                <span className="training-card-cta">
                  <i className="fa-solid fa-arrow-right-to-bracket" /> 신청하기
                </span>
              ) : (
                <span className="training-card-status" style={{ color: 'var(--text-muted)' }}>
                  신청 불가
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}