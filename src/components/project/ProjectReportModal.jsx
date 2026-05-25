// components/project/ProjectReportModal.jsx
// 완료 보고서 편집 + HTML/MD 다운로드.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import { REPORT_SECTIONS, emptyReport } from '../../config/projectReportConfig';
import {
  buildReportHTML, buildReportMarkdown,
  downloadFile, openPrintWindow, safeFilename,
} from '../../utils/projectReportExport';

export default function ProjectReportModal() {
  const toast = useToast();
  const {
    reportModalTarget, closeReportModal,
    fetchProjectReport, updateProjectReport,
  } = useProject();

  const open = reportModalTarget != null;
  const project = reportModalTarget;

  const [form, setForm] = useState(emptyReport());
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState('view'); // 'view' | 'edit'

  /* 보고서 로드 */
  useEffect(() => {
    if (!open || !project) return;
    setLoading(true);
    setMode('view');
    (async () => {
      const res = await fetchProjectReport(project.id);
      if (res.ok && res.report) {
        setForm({
          goals: res.report.goals || '',
          achievements: res.report.achievements || '',
          milestones: res.report.milestones || '',
          issues: res.report.issues || '',
          learnings: res.report.learnings || '',
          next_steps: res.report.next_steps || '',
        });
        setSnapshot(res.report.snapshot);
      } else {
        setForm(emptyReport());
        setSnapshot(null);
      }
      setDirty(false);
      setLoading(false);
    })();
  }, [open, project, fetchProjectReport]);

  const patch = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateProjectReport(project.id, form);
    setSaving(false);
    if (res.ok) {
      toast.success('보고서가 저장됐어요');
      setDirty(false);
      setMode('view');
    } else {
      toast.error(res.error || '저장 실패');
    }
  };

  const handleCancel = () => {
    if (dirty && !confirm('변경사항이 저장되지 않았어요. 닫을까요?')) return;
    closeReportModal();
  };

  const handleDownloadPDF = () => {
    const html = buildReportHTML(project, form, snapshot);
    openPrintWindow(html);
    toast.info('새 창에서 인쇄 / PDF 저장을 진행하세요');
  };

  const handleDownloadHTML = () => {
    const html = buildReportHTML(project, form, snapshot);
    downloadFile(html, `${safeFilename(project.title)}_보고서.html`, 'text/html');
    toast.success('HTML 파일로 저장됐어요');
  };

  const handleDownloadMD = () => {
    const md = buildReportMarkdown(project, form, snapshot);
    downloadFile(md, `${safeFilename(project.title)}_보고서.md`, 'text/markdown');
    toast.success('Markdown 파일로 저장됐어요');
  };

  if (!project) return null;

  return (
    <Modal
      isOpen={open}
      onClose={handleCancel}
      size="lg"
      title={
        <>
          <i className="fa-solid fa-file-lines" style={{ color: project.color }} />
          {project.title} — 완료 보고서
        </>
      }
    >
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
        </div>
      ) : (
        <>
          {/* 액션 바 */}
          <div className="pr-action-bar">
            <div className="pr-mode-toggle">
              <button
                type="button"
                className={mode === 'view' ? 'active' : ''}
                onClick={() => {
                  if (dirty && !confirm('변경사항이 저장되지 않았어요. 보기 모드로 전환할까요?')) return;
                  setMode('view');
                }}
              >
                <i className="fa-solid fa-eye" /> 보기
              </button>
              <button
                type="button"
                className={mode === 'edit' ? 'active' : ''}
                onClick={() => setMode('edit')}
              >
                <i className="fa-solid fa-pen" /> 편집
              </button>
            </div>

            <div className="pr-download-group">
              <button
                type="button"
                className="pr-dl-btn pr-dl-pdf"
                onClick={handleDownloadPDF}
                title="새 창에서 인쇄 / PDF 저장"
              >
                <i className="fa-solid fa-print" /> 인쇄·PDF
              </button>
              <button
                type="button"
                className="pr-dl-btn"
                onClick={handleDownloadHTML}
                title="HTML 파일 다운로드"
              >
                <i className="fa-solid fa-file-code" /> HTML
              </button>
              <button
                type="button"
                className="pr-dl-btn"
                onClick={handleDownloadMD}
                title="Markdown 파일 다운로드"
              >
                <i className="fa-brands fa-markdown" /> MD
              </button>
            </div>
          </div>

          {/* 보고서 본문 */}
          <div className="pr-body">
            {/* 통계 카드 */}
            {snapshot && (
              <div className="pr-stat-grid">
                <div className="pr-stat" style={{ borderColor: `${project.color}40` }}>
                  <strong style={{ color: project.color }}>{snapshot.tasks_total || 0}</strong>
                  <span>전체 태스크</span>
                </div>
                <div className="pr-stat" style={{ borderColor: `${project.color}40` }}>
                  <strong style={{ color: project.color }}>{snapshot.tasks_done || 0}</strong>
                  <span>완료 태스크</span>
                </div>
                <div className="pr-stat" style={{ borderColor: `${project.color}40` }}>
                  <strong style={{ color: project.color }}>{snapshot.completion_rate || 0}%</strong>
                  <span>완료율</span>
                </div>
                <div className="pr-stat" style={{ borderColor: `${project.color}40` }}>
                  <strong style={{ color: project.color }}>{snapshot.member_count || 0}</strong>
                  <span>참여 인원</span>
                </div>
              </div>
            )}

            {/* 멤버 */}
            {snapshot?.member_names?.length > 0 && (
              <div className="pr-section">
                <h3>👥 참여 멤버</h3>
                <div className="pr-member-row">
                  {snapshot.member_names.map((n, i) => (
                    <span key={i} className="pr-member-pill">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 섹션들 */}
            {REPORT_SECTIONS.map((sec) => (
              <div key={sec.field} className="pr-section">
                <h3>{sec.label}</h3>
                {mode === 'edit' ? (
                  <textarea
                    className="pc-textarea"
                    rows={sec.rows}
                    placeholder={sec.placeholder}
                    value={form[sec.field] || ''}
                    onChange={(e) => patch(sec.field, e.target.value)}
                  />
                ) : (
                  <div className="pr-section-body">
                    {form[sec.field]
                      ? form[sec.field].split('\n').map((line, i) => (
                          <p key={i}>{line || '\u00a0'}</p>
                        ))
                      : <em>(작성되지 않음)</em>
                    }
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 하단 액션 */}
          {mode === 'edit' && (
            <div className="pc-modal-foot">
              <button
                type="button"
                className="btn btn-out"
                onClick={() => {
                  if (dirty && !confirm('변경사항을 버릴까요?')) return;
                  setMode('view');
                  setDirty(false);
                }}
                disabled={saving}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-in"
                onClick={handleSave}
                disabled={saving || !dirty}
              >
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin" /> 저장 중...</>
                  : <><i className="fa-solid fa-check" /> 저장</>
                }
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}