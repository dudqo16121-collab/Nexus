// 교육/연수 상단 — 타이틀 + 통계 + 뷰 필터.

import { useTraining } from '../../contexts/TrainingContext';

export default function TrainingHeader() {
  const { stats, filter, setFilter, isAdmin, openEditor } = useTraining();

  return (
    <header className="training-header">
      <div className="training-header-top">
        <div>
          <h2>
            <i className="fa-solid fa-graduation-cap" style={{ color: 'var(--primary-color)', marginRight: 10 }} />
            교육/연수 관리
          </h2>
          <p className="training-header-tagline">
            성장하는 팀, 성장하는 회사. 필수 교육과 자기계발 과정을 신청하고 이수 현황을 관리하세요.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-in"
            style={{ width: 'auto', padding: '10px 18px' }}
            onClick={() => openEditor(null)}
          >
            <i className="fa-solid fa-plus" /> 과정 추가
          </button>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="training-stats">
        <div className="training-stat-card">
          <div className="training-stat-icon" style={{ background: 'rgba(67, 97, 238, 0.1)', color: '#4361ee' }}>
            <i className="fa-solid fa-book-open" />
          </div>
          <div>
            <div className="training-stat-value">{stats.openCourses}</div>
            <div className="training-stat-label">모집 중인 과정</div>
          </div>
        </div>

        <div className="training-stat-card">
          <div className="training-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <i className="fa-solid fa-clock" />
          </div>
          <div>
            <div className="training-stat-value">{stats.myPending}</div>
            <div className="training-stat-label">내 대기 신청</div>
          </div>
        </div>

        <div className="training-stat-card">
          <div className="training-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <i className="fa-solid fa-check" />
          </div>
          <div>
            <div className="training-stat-value">{stats.myActive}</div>
            <div className="training-stat-label">진행 중</div>
          </div>
        </div>

        <div className="training-stat-card">
          <div className="training-stat-icon" style={{ background: 'rgba(247, 37, 133, 0.1)', color: '#f72585' }}>
            <i className="fa-solid fa-trophy" />
          </div>
          <div>
            <div className="training-stat-value">{stats.myCompleted}</div>
            <div className="training-stat-label">이수 완료</div>
          </div>
        </div>
      </div>

      {/* 뷰 필터 */}
      <div className="training-filter-tabs">
        <button
          type="button"
          className={`training-filter-tab ${filter === 'open' ? 'active' : ''}`}
          onClick={() => setFilter('open')}
        >
          모집 중
        </button>
        <button
          type="button"
          className={`training-filter-tab ${filter === 'mine' ? 'active' : ''}`}
          onClick={() => setFilter('mine')}
        >
          내 신청 내역
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`training-filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 보기
          </button>
        )}
      </div>
    </header>
  );
}