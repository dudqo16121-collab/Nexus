// components/groupware/CoWorkRetroModal.jsx
// 세션 종료 + 회고 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useCoWork, OUTCOMES, COWORK_CATEGORIES } from '../../contexts/CoWorkContext';
import { useToast } from '../../contexts/ToastContext';

function fmtDuration(start, end = new Date()) {
  const ms = new Date(end) - new Date(start);
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}시간 ${m}분`;
}

export default function CoWorkRetroModal() {
  const toast = useToast();
  const { retroModalSession, closeRetroModal, endSession, sessionMembers } = useCoWork();

  const open = !!retroModalSession;
  const session = retroModalSession;

  const [outcome, setOutcome] = useState('done');
  const [retroNote, setRetroNote] = useState('');
  const [shareToFeed, setShareToFeed] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOutcome('done');
    setRetroNote('');
    setShareToFeed(true);
  }, [open]);

  if (!session) return null;

  const cat = COWORK_CATEGORIES.find((c) => c.value === session.category);
  const mems = sessionMembers(session.id);

  const handleEnd = async () => {
    setSubmitting(true);
    const res = await endSession(session.id, { outcome, retroNote, shareToFeed });
    setSubmitting(false);
    if (res.ok) {
      toast.success(
        shareToFeed
          ? '세션을 종료하고 회고를 게시판에 공유했어요.'
          : '세션을 종료했어요.'
      );
      closeRetroModal();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeRetroModal} size="md" title="세션 종료 + 회고">
      <div className="cowork-form">
        {/* 세션 요약 */}
        <div className="cowork-retro-summary">
          <div className="cowork-retro-row">
            <span className="cowork-retro-label">제목</span>
            <strong>{session.title}</strong>
          </div>
          {cat && (
            <div className="cowork-retro-row">
              <span className="cowork-retro-label">카테고리</span>
              <span className="cowork-retro-cat" style={{ color: cat.color }}>
                <i className={`fa-solid ${cat.icon}`} /> {cat.label}
              </span>
            </div>
          )}
          {session.goal && (
            <div className="cowork-retro-row">
              <span className="cowork-retro-label">목표</span>
              <span>{session.goal}</span>
            </div>
          )}
          <div className="cowork-retro-row">
            <span className="cowork-retro-label">소요</span>
            <span>{fmtDuration(session.started_at)}</span>
          </div>
          <div className="cowork-retro-row">
            <span className="cowork-retro-label">참여자</span>
            <span>{mems.map((m) => m.user_name).join(', ') || '-'}</span>
          </div>
        </div>

        {/* 결과 */}
        <label className="cowork-label">결과</label>
        <div className="cowork-outcome-grid">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`cowork-outcome-btn ${outcome === o.value ? 'active' : ''}`}
              style={
                outcome === o.value
                  ? { background: o.color, borderColor: o.color, color: '#fff' }
                  : { color: o.color, borderColor: `${o.color}50` }
              }
              onClick={() => setOutcome(o.value)}
            >
              <i className={`fa-solid ${o.icon}`} />
              {o.label}
            </button>
          ))}
        </div>

        {/* 메모 */}
        <label className="cowork-label">회고 메모</label>
        <textarea
          rows={4}
          value={retroNote}
          onChange={(e) => setRetroNote(e.target.value)}
          placeholder="무엇을 했고, 무엇이 잘됐고, 무엇이 어려웠나요?"
          className="cowork-textarea"
        />

        {/* 활동 피드 공유 */}
        <label className="cowork-toggle">
          <input
            type="checkbox"
            checked={shareToFeed}
            onChange={(e) => setShareToFeed(e.target.checked)}
          />
          <span>
            <i className="fa-solid fa-share-nodes" /> 회고를 전사 게시판에 공유하기
          </span>
        </label>
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeRetroModal} disabled={submitting}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleEnd} disabled={submitting}>
          {submitting ? '종료 중...' : <><i className="fa-solid fa-flag-checkered" /> 세션 종료</>}
        </button>
      </div>
    </Modal>
  );
}