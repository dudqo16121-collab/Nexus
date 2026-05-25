// components/meeting/parts/LiveNotesEditor.jsx
// Live 단계 메모 — 자동 저장 (디바운스).

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';

const SAVE_DELAY_MS = 800;

export default function LiveNotesEditor() {
  const { user } = useAuth();
  const { current, updateCanvas } = useMeetingCanvas();

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const initialized = useRef(false);
  const saveTimer = useRef(null);
  const textareaRef = useRef(null);

  /* 초기 로드 — 캔버스 데이터에서 live_notes 가져오기 */
  useEffect(() => {
    if (current?.canvas && !initialized.current) {
      setNotes(current.canvas.live_notes || '');
      initialized.current = true;
    }
  }, [current?.canvas]);

  /* 디바운스 저장 */
  const debouncedSave = useCallback((value) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!current?.canvas?.id) return;
      setSaving(true);
      const res = await updateCanvas(current.canvas.id, { live_notes: value });
      setSaving(false);
      if (res.ok) setSavedAt(new Date());
    }, SAVE_DELAY_MS);
  }, [current?.canvas?.id, updateCanvas]);

  const handleChange = (e) => {
    const v = e.target.value;
    setNotes(v);
    debouncedSave(v);
  };

  /* 언마운트 시 즉시 저장 */
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  if (!current) return null;
  const { canvas, attendees } = current;
  const canEdit = canvas.host_id === user?.id || attendees.some((a) => a.user_id === user?.id);

  /* 저장 시간 표시 */
  const renderSaveStatus = () => {
    if (saving) {
      return (
        <span className="mc-save-status saving">
          <i className="fa-solid fa-circle-notch fa-spin" /> 저장 중...
        </span>
      );
    }
    if (savedAt) {
      const elapsed = Math.round((Date.now() - savedAt.getTime()) / 1000);
      if (elapsed < 5) {
        return (
          <span className="mc-save-status saved">
            <i className="fa-solid fa-check" /> 저장됨
          </span>
        );
      }
      return (
        <span className="mc-save-status">
          {savedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장
        </span>
      );
    }
    return null;
  };

  return (
    <section className="mc-live-notes">
      <div className="mc-live-notes-head">
        <h3>
          <i className="fa-regular fa-note-sticky" />
          회의 메모
        </h3>
        {renderSaveStatus()}
      </div>

      <textarea
        ref={textareaRef}
        className="mc-live-notes-area"
        placeholder={
          canEdit
            ? '회의 중 메모를 자유롭게 작성하세요.\n\n• 발언 내용\n• @이름 으로 멘션\n• 중요한 부분은 우측 결정/액션 패널에 추가\n\n자동 저장됩니다.'
            : '권한이 없어요.'
        }
        value={notes}
        onChange={handleChange}
        disabled={!canEdit}
      />

      <div className="mc-live-notes-hint">
        <i className="fa-solid fa-lightbulb" /> 결정사항이나 액션이 나오면 우측 패널에 추가하세요
      </div>
    </section>
  );
}