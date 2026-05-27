// src/components/project/situation/SituationKPI.jsx
// KPI 4칸 — 진행률 / 태스크 / 멤버 / D-Day.

import { ddayText, ddayClass } from '../../../utils/projectHelpers';

export default function SituationKPI({ project, tasks, members }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const inProgress = tasks.filter((t) => t.status === 'doing').length;
  const review = tasks.filter((t) => t.status === 'review').length;

  const dday = ddayText(project.end_date);
  const ddayCls = ddayClass(project.end_date);
  const ddayColor = ddayCls === 'overdue' ? '#f72585' : 'var(--text-main)';

  const cards = [
    {
      key: 'progress',
      icon: 'fa-circle-check',
      iconBg: '#06d6a020',
      iconColor: '#06d6a0',
      label: '완료율',
      value: `${pct}%`,
      sub: `${done} / ${total} 완료`,
      progressBar: pct,
      progressColor: project.color || '#06d6a0',
    },
    {
      key: 'active',
      icon: 'fa-bolt',
      iconBg: '#4361ee20',
      iconColor: '#4361ee',
      label: '진행 중',
      value: inProgress,
      sub: `리뷰 ${review}건 대기`,
    },
    {
      key: 'members',
      icon: 'fa-users',
      iconBg: '#8338ec20',
      iconColor: '#8338ec',
      label: '참여 멤버',
      value: members.length,
      sub: members.length > 0 ? `${members[0]?.full_name || ''}${members.length > 1 ? ` 외 ${members.length - 1}명` : ''}` : '아직 없음',
    },
    {
      key: 'deadline',
      icon: 'fa-flag-checkered',
      iconBg: ddayCls === 'overdue' ? '#f7258520' : '#ff9f1c20',
      iconColor: ddayCls === 'overdue' ? '#f72585' : '#ff9f1c',
      label: '마감까지',
      value: project.end_date ? dday : '미정',
      sub: project.end_date || '기한 없음',
      valueColor: ddayColor,
    },
  ];

  return (
    <div className="psr-kpi-strip">
      {cards.map((c) => (
        <div key={c.key} className="psr-kpi-card">
          <div className="psr-kpi-icon" style={{ background: c.iconBg, color: c.iconColor }}>
            <i className={`fa-solid ${c.icon}`} />
          </div>
          <div className="psr-kpi-body">
            <p className="psr-kpi-label">{c.label}</p>
            <h3 className="psr-kpi-value" style={c.valueColor ? { color: c.valueColor } : undefined}>
              {c.value}
            </h3>
            <p className="psr-kpi-sub">{c.sub}</p>
            {c.progressBar !== undefined && (
              <div className="psr-kpi-progress">
                <span
                  style={{
                    width: `${c.progressBar}%`,
                    background: c.progressColor,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}