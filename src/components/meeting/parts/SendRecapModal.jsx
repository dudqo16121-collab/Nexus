// components/meeting/parts/SendRecapModal.jsx
// 참석자에게 회의록 알림 발송.

import { useState } from 'react';
import Modal from '../../common/Modal';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useToast } from '../../../contexts/ToastContext';

export default function SendRecapModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { current } = useMeetingCanvas();
  const { createBulkNotifications } = useNotification();
  const toast = useToast();

  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDecisions, setIncludeDecisions] = useState(true);
  const [includeActions, setIncludeActions] = useState(true);
  const [extraMessage, setExtraMessage] = useState('');
  const [sending, setSending] = useState(false);

  if (!current?.canvas) return null;
  const { canvas, attendees, decisions } = current;

  /* 알림 받을 사람 — 본인 제외 */
  const recipients = attendees
    .filter((a) => a.user_id && a.user_id !== user?.id)
    .map((a) => a.user_id);

  const decisionCount = decisions.filter((d) => d.type === 'decision').length;
  const actionCount = decisions.filter((d) => d.type === 'action').length;

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.warning('알림 받을 참석자가 없어요');
      return;
    }

    /* 알림 본문 자동 구성 */
    const parts = [];
    if (extraMessage.trim()) parts.push(extraMessage.trim());
    if (includeSummary && canvas.summary) {
      parts.push(`회의록이 정리됐어요`);
    }
    if (includeDecisions && decisionCount > 0) {
      parts.push(`결정 ${decisionCount}건`);
    }
    if (includeActions && actionCount > 0) {
      parts.push(`액션 ${actionCount}건`);
    }
    const body = parts.length > 0 ? parts.join(' · ') : '회의록을 확인해주세요';

    setSending(true);
    try {
      await createBulkNotifications(recipients, {
        type: 'project',
        title: `📋 [회의록] ${canvas.title}`,
        body,
        link: `/meetings`,
        refId: canvas.id,
      });
      toast.success(`${recipients.length}명에게 회의록 알림을 보냈어요`);
      onClose();
    } catch (e) {
      console.error('[SendRecap]', e);
      toast.error('알림 발송 실패');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <>
          <i className="fa-solid fa-paper-plane" style={{ color: '#4361ee' }} />
          참석자에게 회의록 발송
        </>
      }
    >
      <div style={{ padding: 4 }}>
        <div className="mc-recap-info">
          <i className="fa-solid fa-users" />
          <strong>{recipients.length}명</strong>의 참석자에게 NEXUS 알림을 보냅니다
        </div>

        <div className="form-group">
          <label className="form-label">알림에 포함할 내용</label>
          <div className="mc-recap-options">
            <label className={`mc-recap-option ${includeSummary ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                disabled={!canvas.summary}
              />
              <span>
                <i className="fa-solid fa-file-lines" />
                회의록 요약
                {!canvas.summary && <small>(아직 작성 안 됨)</small>}
              </span>
            </label>
            <label className={`mc-recap-option ${includeDecisions ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={includeDecisions}
                onChange={(e) => setIncludeDecisions(e.target.checked)}
                disabled={decisionCount === 0}
              />
              <span>
                <i className="fa-solid fa-gavel" />
                결정사항 {decisionCount}건
              </span>
            </label>
            <label className={`mc-recap-option ${includeActions ? 'selected' : ''}`}>
              <input
                type="checkbox"
                checked={includeActions}
                onChange={(e) => setIncludeActions(e.target.checked)}
                disabled={actionCount === 0}
              />
              <span>
                <i className="fa-solid fa-bolt" />
                액션 아이템 {actionCount}건
              </span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">추가 메시지 (선택)</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="예: 자세한 내용은 캔버스에서 확인해주세요. 다음 회의는 5/30(목) 14:00."
            value={extraMessage}
            onChange={(e) => setExtraMessage(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-out" onClick={onClose} disabled={sending}>
            취소
          </button>
          <button
            type="button"
            className="btn btn-in"
            onClick={handleSend}
            disabled={sending || recipients.length === 0}
          >
            {sending ? (
              <><i className="fa-solid fa-spinner fa-spin" /> 발송 중...</>
            ) : (
              <><i className="fa-solid fa-paper-plane" /> {recipients.length}명에게 발송</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}