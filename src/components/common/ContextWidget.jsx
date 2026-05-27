// src/components/common/ContextWidget.jsx
// 횡단 연결 위젯 — 한 자산의 모든 연결을 카드 그리드로 표시.
// 회의/결재/위키/태스크/프로젝트 상세 어디서든 import 해서 쓴다.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextLinks } from '../../contexts/ContextLinksContext';
import { useMeetingCanvas } from '../../contexts/MeetingCanvasContext';
import { getPhaseMeta, getDecisionTypeMeta } from '../../config/meetingCanvasConfig';

/* 섹션 메타 — 아이콘/색/라벨 */
const SECTIONS = [
  { key: 'meetings',  label: '관련 회의',     icon: 'fa-microphone',       color: '#ec4899' },
  { key: 'decisions', label: '관련 결정/액션', icon: 'fa-gavel',            color: '#4361ee' },
  { key: 'tasks',     label: '관련 칸반 카드', icon: 'fa-list-check',       color: '#8338ec' },
  { key: 'approvals', label: '관련 결재',     icon: 'fa-stamp',            color: '#f72585' },
  { key: 'wikis',     label: '관련 위키',     icon: 'fa-book',             color: '#06d6a0' },
  { key: 'projects',  label: '관련 프로젝트', icon: 'fa-diagram-project',  color: '#ff9f1c' },
];

export default function ContextWidget({ kind, id, exclude = [], compact = false }) {
  const navigate = useNavigate();
  const { resolveLinks } = useContextLinks();
  const { fetchCanvas } = useMeetingCanvas();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!kind || !id) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    resolveLinks({ kind, id }).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [kind, id, resolveLinks]);

  if (loading) {
    return (
      <div className="ctx-widget ctx-widget-loading">
        <i className="fa-solid fa-spinner fa-spin" /> 연결된 자료를 찾는 중…
      </div>
    );
  }
  if (!data) return null;

  /* exclude — 자기 자신은 보여줄 필요 없으니 호출처에서 지정 가능 */
  const sections = SECTIONS
    .filter((s) => !exclude.includes(s.key))
    .map((s) => ({ ...s, items: data[s.key] || [] }))
    .filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  const total = sections.reduce((acc, s) => acc + s.items.length, 0);

  /* ── 네비게이션 헬퍼 ── */
  const goToMeeting = (m) => { fetchCanvas(m.id); navigate('/meetings'); };
  const goToTask = (t) => navigate(`/project?id=${t.project_id}&task=${t.id}`);
  const goToApproval = () => navigate('/approval');
  const goToWiki = (w) => navigate(`/wiki?doc=${w.id}`);
  const goToProject = (p) => navigate(`/project?id=${p.id}`);
  const goToDecisions = () => navigate('/decisions');

  return (
    <section className={`ctx-widget ${compact ? 'ctx-widget-compact' : ''}`}>
      <button
        type="button"
        className="ctx-widget-header"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="ctx-widget-title">
          <i className="fa-solid fa-diagram-project" />
          연결된 자료
          <span className="ctx-widget-count">{total}</span>
        </span>
        <i className={`fa-solid fa-chevron-down ctx-widget-chev ${collapsed ? '' : 'rotated'}`} />
      </button>

      {!collapsed && (
        <div className="ctx-widget-body">
          {sections.map((s) => (
            <div key={s.key} className="ctx-section">
              <h4 className="ctx-section-title" style={{ color: s.color }}>
                <i className={`fa-solid ${s.icon}`} /> {s.label}
                <span className="ctx-section-count">{s.items.length}</span>
              </h4>

              <div className="ctx-card-grid">
                {s.items.map((it) => {
                  /* 섹션별 카드 렌더 분기 */
                  switch (s.key) {
                    case 'meetings': {
                      const phase = getPhaseMeta(it.phase);
                      return (
                        <button key={it.id} type="button" className="ctx-card" onClick={() => goToMeeting(it)}>
                          <span className="ctx-card-badge" style={{ background: `${phase.color}20`, color: phase.color }}>
                            {phase.label}
                          </span>
                          <strong className="ctx-card-title">{it.title || '제목 없음'}</strong>
                          {it.host_name && <span className="ctx-card-sub"><i className="fa-solid fa-user-tie" /> {it.host_name}</span>}
                          {it.scheduled_at && <span className="ctx-card-sub">{fmtDate(it.scheduled_at)}</span>}
                          <span className="ctx-card-reason">{it._reason}</span>
                        </button>
                      );
                    }
                    case 'decisions': {
                      const meta = getDecisionTypeMeta(it.type);
                      return (
                        <button key={it.id} type="button" className="ctx-card" onClick={goToDecisions}>
                          <span className="ctx-card-badge" style={{ background: `${meta.color}20`, color: meta.color }}>
                            <i className={`fa-solid ${meta.icon}`} /> {meta.label}
                          </span>
                          <strong className="ctx-card-title">{truncate(it.content, 80)}</strong>
                          {it.owner_name && <span className="ctx-card-sub"><i className="fa-solid fa-user" /> {it.owner_name}</span>}
                          {it.due_date && <span className="ctx-card-sub"><i className="fa-regular fa-clock" /> {it.due_date}</span>}
                          <span className="ctx-card-reason">{it._reason}</span>
                        </button>
                      );
                    }
                    case 'tasks':
                      return (
                        <button key={it.id} type="button" className="ctx-card" onClick={() => goToTask(it)}>
                          <span className="ctx-card-badge" style={{ background: '#8338ec20', color: '#8338ec' }}>
                            {it.status}
                          </span>
                          <strong className="ctx-card-title">{it.title}</strong>
                          {it.due_date && <span className="ctx-card-sub"><i className="fa-regular fa-clock" /> {it.due_date}</span>}
                          <span className="ctx-card-reason">{it._reason}</span>
                        </button>
                      );
                    case 'approvals':
                      return (
                        <button key={it.id} type="button" className="ctx-card" onClick={goToApproval}>
                          <span className="ctx-card-badge" style={{ background: '#f7258520', color: '#f72585' }}>
                            {it.type}
                          </span>
                          <strong className="ctx-card-title">{it.title}</strong>
                          <span className="ctx-card-sub">{it.doc_number} · {it.drafter_name}</span>
                          <span className="ctx-card-reason">{it._reason}</span>
                        </button>
                      );
                    case 'wikis':
                      return (
                        <button key={it.id} type="button" className="ctx-card" onClick={() => goToWiki(it)}>
                          <span className="ctx-card-badge" style={{ background: '#06d6a020', color: '#06d6a0' }}>
                            {it.category || '문서'}
                          </span>
                          <strong className="ctx-card-title">{it.title}</strong>
                          {it.updated_at && <span className="ctx-card-sub">{fmtDate(it.updated_at)}</span>}
                          <span className="ctx-card-reason">{it._reason}</span>
                        </button>
                      );
                    case 'projects':
                      return (
                        <button key={it.id} type="button" className="ctx-card" onClick={() => goToProject(it)}>
                          <span className="ctx-card-badge" style={{ background: '#ff9f1c20', color: '#ff9f1c' }}>
                            {it.status || '진행'}
                          </span>
                          <strong className="ctx-card-title">{it.title}</strong>
                          <span className="ctx-card-reason">{it._reason}</span>
                        </button>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── 유틸 ── */
function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
}