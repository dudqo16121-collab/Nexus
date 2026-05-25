// components/pulse/admin/PulseAdminList.jsx
// 관리자 — 설문 생성/활성화/마감/삭제.

import { useState } from 'react';
import { usePulse } from '../../../contexts/PulseContext';
import { useToast } from '../../../contexts/ToastContext';
import { getStatusMeta } from '../../../config/pulseTypes';
import PulseEditor from './PulseEditor';
import PulseSurveyResults from '../PulseSurveyResults';

export default function PulseAdminList() {
  const { surveys, activateSurvey, updateSurvey, deleteSurvey, loading } = usePulse();
  const toast = useToast();
  const [editorTarget, setEditorTarget] = useState(null);  // null = 닫힘, {} = 새로, {id, ...} = 편집
  const [resultsTarget, setResultsTarget] = useState(null);

  if (loading) return <div className="ps-empty"><i className="fa-solid fa-spinner fa-spin" /></div>;

  const handleActivate = async (s) => {
    if (!confirm(`"${s.title}" 설문을 활성화하고 전사 알림을 보낼까요?`)) return;
    const res = await activateSurvey(s.id);
    if (res.ok) toast.success('활성화 + 알림 발송 완료');
    else toast.error(res.error);
  };

  const handleClose = async (s) => {
    if (!confirm(`"${s.title}" 설문을 마감할까요?`)) return;
    const res = await updateSurvey(s.id, { status: 'closed' });
    if (res.ok) toast.success('마감됨');
    else toast.error(res.error);
  };

  const handleDelete = async (s) => {
    if (!confirm(`"${s.title}" 설문을 삭제할까요? 응답 데이터도 함께 삭제됩니다.`)) return;
    const res = await deleteSurvey(s.id);
    if (res.ok) toast.success('삭제됨');
    else toast.error(res.error);
  };

  return (
    <div className="ps-admin">
      <div className="ps-admin-head">
        <h3>설문 관리</h3>
        <button
          type="button"
          className="ps-btn-primary"
          onClick={() => setEditorTarget({})}
        >
          <i className="fa-solid fa-plus" /> 새 설문 만들기
        </button>
      </div>

      <table className="ps-admin-table">
        <thead>
          <tr>
            <th>제목</th>
            <th>상태</th>
            <th>응답</th>
            <th>기간</th>
            <th style={{ width: 280 }}>액션</th>
          </tr>
        </thead>
        <tbody>
          {surveys.length === 0 && (
            <tr><td colSpan={5} className="ps-admin-empty">아직 만든 설문이 없어요</td></tr>
          )}
          {surveys.map((s) => {
            const stat = getStatusMeta(s.status);
            return (
              <tr key={s.id}>
                <td>
                  <strong>{s.title}</strong>
                  {s.description && <p className="ps-admin-desc">{s.description}</p>}
                </td>
                <td>
                  <span
                    className="ps-status-badge"
                    style={{ background: `${stat.color}22`, color: stat.color }}
                  >
                    {stat.label}
                  </span>
                </td>
                <td><strong>{s.response_count || 0}</strong>건</td>
                <td className="ps-admin-dates">
                  {new Date(s.start_at).toLocaleDateString('ko-KR')} <br/>
                  ~ {new Date(s.end_at).toLocaleDateString('ko-KR')}
                </td>
                <td>
                  <div className="ps-admin-actions">
                    {s.status === 'draft' && (
                      <>
                        <button
                          type="button"
                          className="ps-btn-mini ps-btn-mini-primary"
                          onClick={() => handleActivate(s)}
                        >
                          <i className="fa-solid fa-play" /> 활성화
                        </button>
                        <button
                          type="button"
                          className="ps-btn-mini"
                          onClick={() => setEditorTarget(s)}
                        >
                          편집
                        </button>
                      </>
                    )}
                    {s.status === 'active' && (
                      <button
                        type="button"
                        className="ps-btn-mini"
                        onClick={() => handleClose(s)}
                      >
                        <i className="fa-solid fa-stop" /> 마감
                      </button>
                    )}
                    <button
                      type="button"
                      className="ps-btn-mini"
                      onClick={() => setResultsTarget(s)}
                    >
                      <i className="fa-solid fa-chart-simple" /> 결과
                    </button>
                    {s.status !== 'active' && (
                      <button
                        type="button"
                        className="ps-btn-mini ps-btn-mini-danger"
                        onClick={() => handleDelete(s)}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editorTarget && (
        <PulseEditor
          initial={editorTarget.id ? editorTarget : null}
          onClose={() => setEditorTarget(null)}
          onDone={() => setEditorTarget(null)}
        />
      )}

      {resultsTarget && (
        <PulseSurveyResults
          survey={resultsTarget}
          onClose={() => setResultsTarget(null)}
        />
      )}
    </div>
  );
}