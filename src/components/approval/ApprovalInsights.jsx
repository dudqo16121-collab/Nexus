// 결재함 통계 패널 (5단계)
// 양식별 분포 / 최근 처리 활동 / 처리 시간 분포

import { useMemo } from 'react';
import { useApproval } from '../../contexts/ApprovalContext';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_META = {
  업무기안서: { color: '#4361ee', short: '업무' },
  지출결의서: { color: '#f72585', short: '지출' },
  연차신청서: { color: '#06d6a0', short: '연차' },
  출장신청서: { color: '#ff9f1c', short: '출장' },
  구매요청서: { color: '#8338ec', short: '구매' },
  품의서:     { color: '#64748b', short: '품의' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export default function ApprovalInsights({ isOpen }) {
  const { approvals } = useApproval();
  const { user } = useAuth();

  /* 양식별 분포 (전체 문서 기준) */
  const byType = useMemo(() => {
    const map = {};
    approvals.forEach((doc) => {
      const t = doc.type || '기타';
      map[t] = (map[t] || 0) + 1;
    });
    const total = approvals.length || 1;
    return Object.entries(map)
      .map(([type, count]) => ({
        type,
        count,
        percent: Math.round((count / total) * 100),
        color: TYPE_META[type]?.color || '#64748b',
      }))
      .sort((a, b) => b.count - a.count);
  }, [approvals]);

  /* 최근 처리 활동 — 내가 처리한 문서 (acted_at 있는 것) */
  const recentActivity = useMemo(() => {
    if (!user) return [];
    const acts = [];
    approvals.forEach((doc) => {
      (doc.approvers || []).forEach((apv) => {
        if (apv.id === user.id && apv.acted_at) {
          acts.push({
            id: `${doc.id}-${apv.id}`,
            docTitle: doc.title,
            docNumber: doc.doc_number,
            status: apv.status,
            actedAt: apv.acted_at,
            type: doc.type,
          });
        }
      });
    });
    return acts
      .sort((a, b) => new Date(b.actedAt) - new Date(a.actedAt))
      .slice(0, 5);
  }, [approvals, user]);

  /* 처리 시간 분포 — 완료된 문서들의 created_at → updated_at */
  const timeDistribution = useMemo(() => {
    const buckets = {
      '1시간 이내': 0,
      '6시간 이내': 0,
      '1일 이내': 0,
      '3일 이내': 0,
      '3일 이상': 0,
    };

    approvals
      .filter((d) => ['approved', 'rejected'].includes(d.status))
      .forEach((doc) => {
        const hrs = (new Date(doc.updated_at) - new Date(doc.created_at)) / (1000 * 60 * 60);
        if (hrs < 1) buckets['1시간 이내']++;
        else if (hrs < 6) buckets['6시간 이내']++;
        else if (hrs < 24) buckets['1일 이내']++;
        else if (hrs < 72) buckets['3일 이내']++;
        else buckets['3일 이상']++;
      });

    const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(buckets).map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / total) * 100),
    }));
  }, [approvals]);

  if (!isOpen) return null;

  /* 도넛 차트 SVG — 양식별 분포 */
  const renderDonut = () => {
    const total = byType.reduce((acc, x) => acc + x.count, 0) || 1;
    let cumulativeAngle = -90; // 시작점 12시 방향
    const radius = 38;
    const circumference = 2 * Math.PI * radius;

    return (
      <svg viewBox="0 0 100 100" className="appr-donut">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border-color)" strokeWidth="14" />
        {byType.map((item) => {
          const portion = item.count / total;
          const dash = portion * circumference;
          const gap = circumference - dash;
          const rotate = cumulativeAngle;
          cumulativeAngle += portion * 360;

          return (
            <circle
              key={item.type}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotate} 50 50)`}
            />
          );
        })}
        <text x="50" y="50" textAnchor="middle" dy=".3em" className="appr-donut-text">
          {total}
        </text>
        <text x="50" y="50" textAnchor="middle" dy="1.6em" className="appr-donut-sub">
          총 문서
        </text>
      </svg>
    );
  };

  return (
    <div className="appr-insights">
      {/* 양식별 분포 */}
      <div className="appr-insights-card">
        <h4 className="appr-insights-title">
          <i className="fa-solid fa-chart-pie" />
          양식별 분포
        </h4>
        <div className="appr-insights-donut-wrap">
          {byType.length > 0 ? renderDonut() : (
            <div className="appr-insights-empty">데이터 없음</div>
          )}
          <div className="appr-insights-legend">
            {byType.slice(0, 6).map((item) => (
              <div key={item.type} className="appr-insights-legend-item">
                <span className="appr-legend-dot" style={{ background: item.color }} />
                <span className="appr-legend-label">{item.type}</span>
                <strong>{item.count}</strong>
                <span className="appr-legend-pct">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 최근 처리 활동 */}
      <div className="appr-insights-card">
        <h4 className="appr-insights-title">
          <i className="fa-solid fa-clock-rotate-left" />
          최근 내 처리 활동
        </h4>
        {recentActivity.length === 0 ? (
          <div className="appr-insights-empty">아직 처리한 문서가 없어요</div>
        ) : (
          <ul className="appr-insights-activity">
            {recentActivity.map((act) => {
              const isApproved = act.status === 'approved';
              return (
                <li key={act.id} className="appr-insights-activity-item">
                  <span
                    className="appr-activity-dot"
                    style={{
                      background: isApproved ? '#06d6a0' : '#f72585',
                    }}
                  >
                    <i className={`fa-solid ${isApproved ? 'fa-check' : 'fa-xmark'}`} />
                  </span>
                  <div className="appr-activity-body">
                    <div className="appr-activity-title">{act.docTitle}</div>
                    <div className="appr-activity-meta">
                      {act.docNumber} · {isApproved ? '승인' : '반려'} · {timeAgo(act.actedAt)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 처리 시간 분포 */}
      <div className="appr-insights-card">
        <h4 className="appr-insights-title">
          <i className="fa-solid fa-stopwatch" />
          처리 시간 분포
        </h4>
        {timeDistribution.every((b) => b.count === 0) ? (
          <div className="appr-insights-empty">완료된 문서가 없어요</div>
        ) : (
          <ul className="appr-insights-histogram">
            {timeDistribution.map((b) => (
              <li key={b.label}>
                <div className="appr-histogram-row">
                  <span className="appr-histogram-label">{b.label}</span>
                  <span className="appr-histogram-count">{b.count}건</span>
                </div>
                <div className="appr-histogram-bar">
                  <span
                    style={{
                      width: `${b.percent}%`,
                      background: 'var(--primary-color)',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}