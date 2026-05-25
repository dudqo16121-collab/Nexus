// components/meeting/phases/PreMeetingPhase.jsx
// 회의 전 단계 — 안건 + 참석자 + 첨부 자료.

import { useState, useEffect } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import AttendeePicker from '../parts/AttendeePicker';
import AgendaItemList from '../parts/AgendaItemList';
import AttachmentSection from '../parts/AttachmentSection';

export default function PreMeetingPhase() {
  const { user } = useAuth();
  const { current, updateCanvas } = useMeetingCanvas();
  const toast = useToast();

  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  /* 캔버스가 바뀔 때 메모 동기화 */
  useEffect(() => {
    if (current?.canvas) {
      setNotes(current.canvas.agenda || '');
      setNotesDirty(false);
    }
  }, [current?.canvas?.id]);

  if (!current) return null;
  const { canvas, attendees } = current;
  const isHost = canvas.host_id === user?.id;
  const canEdit = isHost || attendees.some((a) => a.user_id === user?.id);

  const handleNotesSave = async () => {
    if (!notesDirty) return;
    setSavingNotes(true);
    const res = await updateCanvas(canvas.id, { agenda: notes });
    setSavingNotes(false);
    if (res.ok) {
      setNotesDirty(false);
      toast.success('저장됐어요');
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="mc-pre">
      <div className="mc-pre-grid">
        <div className="mc-pre-left">
          <AgendaItemList />

          <section className="mc-section">
            <div className="mc-section-head">
              <h3>
                <i className="fa-regular fa-note-sticky" style={{ color: '#ffd166' }} />
                회의 메모 (자유 작성)
              </h3>
              {notesDirty && (
                <button
                  type="button"
                  className="mc-btn-sm primary"
                  onClick={handleNotesSave}
                  disabled={savingNotes}
                >
                  {savingNotes ? '저장 중...' : '저장'}
                </button>
              )}
            </div>
            <textarea
              className="mc-notes-area"
              placeholder={
                canEdit
                  ? '회의 전에 미리 공유할 내용, 배경 정보, 사전 자료 요약 등을 자유롭게 작성하세요.\n\nMarkdown 가능. 회의 중에도 계속 보입니다.'
                  : '권한이 없습니다.'
              }
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
              onBlur={handleNotesSave}
              disabled={!canEdit}
              rows={10}
            />
          </section>
        </div>

        <div className="mc-pre-right">
          <AttendeePicker />
          <AttachmentSection />
        </div>
      </div>
    </div>
  );
}