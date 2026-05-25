// 관리자 탭 — 알림 우선순위별 정리.

import { useWellbeing } from '../../contexts/WellbeingContext';

export default function WellbeingAdmin() {
  const { alerts, todayStats, deptStats } = useWellbeing();

  const groups = {
    high: alerts.filter((a) => a.level === 'high'),
    med:  alerts.filter((a) => a.level === 'med'),
    low:  alerts.filter((a) => a.level === 'low'),
  };

  return (
    <div className="wb-admin">
      <section className="wb-card">
        <header className="wb-card-head">
          <h3><i className="fa-solid fa-shield-halved" /> 알림 센터</h3>
          <span className="wb-card-sub">총 {alerts.length}건</span>
        </header>
        <div className="wb-card-body">
          {alerts.length === 0 ? (
            <div className="wb-empty">
              <i className="fa-solid fa-circle-check" style={{ color: '#06d6a0' }} />
              <p>모든 부서가 양호한 상태예요</p>
            </div>
          ) : (
            <div className="wb-alert-list">
              {['high', 'med', 'low'].map((lv) => groups[lv].map((a, i) => (
                <div key={`${lv}-${i}`} className={`wb-alert wb-alert-${lv}`}>
                  <div className="wb-alert-icon">{a.icon}</div>
                  <div className="wb-alert-body">
                    <div className="wb-alert-dept">{a.dept}</div>
                    <strong>{a.msg}</strong>
                    <p>{a.detail}</p>
                  </div>
                </div>
              )))}
            </div>
          )}
        </div>
      </section>

      <section className="wb-card">
        <header className="wb-card-head">
          <h3><i className="fa-solid fa-chart-pie" /> 오늘 요약</h3>
        </header>
        <div className="wb-card-body">
          <div className="wb-quick-stats">
            <div>
              <span>참여 인원</span>
              <strong>{todayStats.count}명</strong>
            </div>
            <div>
              <span>평균 점수</span>
              <strong>{todayStats.score}</strong>
            </div>
            <div>
              <span>부서 수</span>
              <strong>{deptStats.length}개</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}