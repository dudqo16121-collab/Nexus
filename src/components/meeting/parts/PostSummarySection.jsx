// components/meeting/parts/PostSummarySection.jsx
// 회의록 자유 서술 영역 — summary 컬럼에 자동 저장.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';

const SAVE_DELAY_MS = 800;

export default function PostSummarySection() {
  const { user } = useAuth();
  const { current, updateCanvas } = useMeetingCanvas();

  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const initialized = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (current?.canvas && !initialized.current) {
      setSummary(current.canvas.summary || '');
      initialized.current = true;
    }
  }, [current?.canvas]);

  const debouncedSave = useCallback((value) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!current?.canvas?.id) return;
      setSaving(true);
      const res = await updateCanvas(current.canvas.id, { summary: value });
      setSaving(false);
      if (res.ok) setSavedAt(new Date());
    }, SAVE_DELAY_MS);
  }, [current?.canvas?.id, updateCanvas]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (!current) return null;
  const { canvas, attendees } = current;
  const canEdit = canvas.host_id === user?.id || attendees.some((a) => a.user_id === user?.id);

  /* 회의 메모로부터 자동 초안 채우기 */
  const handleFillFromNotes = () => {
    if (!canvas.live_notes) return;
    if (summary.trim() && !confirm('현재 작성된 내용을 덮어쓸까요?')) return;
    const draft = `## 핵심 요약\n\n[회의 메모를 바탕으로 핵심을 3~5줄로 정리해주세요]\n\n## 회의 중 메모\n\n${canvas.live_notes}`;
    setSummary(draft);
    debouncedSave(draft);
  };

  const renderSaveStatus = () => {
    if (saving) return <span className="mc-save-status saving"><i className="fa-solid fa-circle-notch fa-spin" /> 저장 중...</span>;
    if (savedAt) {
      const elapsed = Math.round((Date.now() - savedAt.getTime()) / 1000);
      if (elapsed < 5) return <span className="mc-save-status saved"><i className="fa-solid fa-check" /> 저장됨</span>;
      return <span className="mc-save-status">{savedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장</span>;
    }
    return null;
  };

  return (
    <section className="mc-post-summary">
      <div className="mc-section-head">
        <h3>
          <i className="fa-solid fa-file-lines" style={{ color: '#06d6a0' }} />
          회의록
        </h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {renderSaveStatus()}
          {canEdit && canvas.live_notes && !summary.trim() && (
            <button
              type="button"
              className="mc-btn-sm"
              onClick={handleFillFromNotes}
              title="회의 중 작성한 메모를 초안으로 가져옵니다"
            >
              <i className="fa-solid fa-wand-magic-sparkles" /> 메모에서 초안 가져오기
            </button>
          )}
        </div>
      </div>

      <textarea
        className="mc-post-summary-area"
        placeholder={
          canEdit
            ? '회의의 핵심 요약을 작성하세요.\n\nMarkdown 가능. 자동 저장됩니다.\n\n예시:\n## 핵심 요약\n- Q1 매출은 목표 대비 12% 미달\n- Q2는 신규고객 확보에 집중\n\n## 다음 회의\n- 5/30(목) Q2 OKR 초안 리뷰'
            : '권한이 없어요.'
        }
        value={summary}
        onChange={(e) => {
          setSummary(e.target.value);
          debouncedSave(e.target.value);
        }}
        disabled={!canEdit}
        rows={10}
      />
    </section>
  );
}