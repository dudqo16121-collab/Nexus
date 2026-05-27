// 메일 작성 모달 — 5단계 최종형.
// 카테고리 / 자주 보내는 사람 / 자동 저장 / 서식 툴바 / 첨부 영역.

import { useEffect, useState, useRef, useMemo } from 'react';
import Modal from '../common/Modal';
import { useMail } from '../../contexts/MailContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { MAIL_CATEGORIES } from '../../config/mailCategories';

const DRAFT_KEY = 'nexus_mail_draft';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

export default function MailComposeModal() {
  const { composeModal, closeCompose, sendMail, allUsers, sent } = useMail();
  const { user } = useAuth();
  const toast = useToast();

  const { open, mode, initial } = composeModal;

  const [recipients, setRecipients] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [sending, setSending] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [attachments, setAttachments] = useState([]); // UI 만, 실제 업로드 X

  const bodyRef = useRef(null);
  const saveTimerRef = useRef(null);

  /* ─── 자주 보내는 사람 (최근 sent 에서 빈도 집계) ─── */
  const frequentRecipients = useMemo(() => {
    if (!sent || sent.length === 0) return [];
    const freq = new Map();
    sent.slice(0, 50).forEach((m) => {
      (m.recipients || []).forEach((r) => {
        if (r.user_id === user?.id) return;
        freq.set(r.user_id, (freq.get(r.user_id) || 0) + 1);
      });
    });
    const top = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([uid]) => allUsers.find((u) => u.id === uid))
      .filter(Boolean);
    return top;
  }, [sent, allUsers, user?.id]);

  /* ─── 모드 따라 초기화 + 드래프트 복구 ─── */
  useEffect(() => {
    if (!open) return;

    if (mode === 'reply' && initial) {
      const sender = allUsers.find((u) => u.id === initial.sender_id);
      setRecipients(sender ? [sender] : []);
      setSubject(initial.subject?.startsWith('Re: ') ? initial.subject : `Re: ${initial.subject || ''}`);
      setBody(`\n\n\n---\n원본 메일\n${(initial.body || '').split('\n').map((l) => '> ' + l).join('\n')}`);
      setCategory(initial.category || 'general');
    } else if (mode === 'forward' && initial) {
      setRecipients([]);
      setSubject(initial.subject?.startsWith('Fwd: ') ? initial.subject : `Fwd: ${initial.subject || ''}`);
      setBody(`\n\n\n---\n전달된 메일\n${(initial.body || '').split('\n').map((l) => '> ' + l).join('\n')}`);
      setCategory(initial.category || 'general');
    } else {
      /* 새 메일 — 드래프트가 있으면 복구 제안 */
      const draft = loadDraft();
      if (draft && (draft.subject || draft.body || draft.recipients?.length)) {
        const restore = window.confirm(
          '작성하던 임시 메일이 있어요. 이어서 작성할까요?\n\n(취소하면 새로 시작합니다)'
        );
        if (restore) {
          /* 수신자 ID → 실제 사용자 객체로 변환 */
          const restoredRecipients = (draft.recipients || [])
            .map((id) => allUsers.find((u) => u.id === id))
            .filter(Boolean);
          setRecipients(restoredRecipients);
          setSubject(draft.subject || '');
          setBody(draft.body || '');
          setCategory(draft.category || 'general');
          toast.info('임시 저장된 내용을 불러왔어요');
        } else {
          clearDraft();
          setRecipients([]);
          setSubject('');
          setBody('');
          setCategory('general');
        }
      } else {
        setRecipients([]);
        setSubject('');
        setBody('');
        setCategory('general');
      }
    }
    setRecipientSearch('');
    setAttachments([]);
    setDraftSaved(false);
  }, [open, mode, initial, allUsers, user]);

  /* ─── 자동 저장 — 5초마다 localStorage 에 저장 (새 메일 모드만) ─── */
  useEffect(() => {
    if (!open || mode !== 'new') return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    /* 빈 메일은 저장 안 함 */
    if (!subject.trim() && !body.trim() && recipients.length === 0) return;

    saveTimerRef.current = setTimeout(() => {
      saveDraft({
        recipients: recipients.map((r) => r.id),
        subject,
        body,
        category,
      });
      setDraftSaved(true);
      /* 3초 후 인디케이터 숨김 */
      setTimeout(() => setDraftSaved(false), 2500);
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [open, mode, recipients, subject, body, category]);

  /* 수신자 검색 후보 */
  const kw = recipientSearch.trim().toLowerCase();
  const candidates = !kw
    ? []
    : allUsers
        .filter((u) => u.id !== user?.id)
        .filter((u) => !recipients.some((r) => r.id === u.id))
        .filter((u) =>
          (u.full_name || '').toLowerCase().includes(kw) ||
          (u.department || '').toLowerCase().includes(kw)
        )
        .slice(0, 6);

  const addRecipient = (u) => {
    setRecipients((prev) => [...prev, u]);
    setRecipientSearch('');
  };
  const removeRecipient = (id) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  /* ─── 서식 툴바 — body textarea 에 마크다운 삽입 ─── */
  const insertAround = (before, after = '') => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end);
    const next = body.slice(0, start) + before + selected + after + body.slice(end);
    setBody(next);
    /* 커서 위치 복원 */
    setTimeout(() => {
      ta.focus();
      const cursorPos = start + before.length + selected.length;
      ta.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };
  const insertAtLineStart = (prefix) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    /* 현재 커서의 줄 시작 위치 찾기 */
    const before = body.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const next = body.slice(0, lineStart) + prefix + body.slice(lineStart);
    setBody(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };
  const insertLink = () => {
    const url = window.prompt('링크 URL을 입력하세요', 'https://');
    if (!url || url === 'https://') return;
    insertAround(`[`, `](${url})`);
  };

  /* 첨부 추가 — UI 만 */
  const handleAttachClick = () => {
    const name = window.prompt('첨부할 파일 이름을 입력하세요 (예: 회의록.pdf)', '');
    if (!name?.trim()) return;
    setAttachments((prev) => [
      ...prev,
      { id: Date.now(), name: name.trim(), size: Math.floor(Math.random() * 500 + 50) },
    ]);
    toast.info('첨부 UI 만 추가됐어요. 실제 업로드는 다음 업데이트에서.');
  };
  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.warning('받는 사람을 1명 이상 선택해주세요.');
      return;
    }
    setSending(true);
    const res = await sendMail({
      subject,
      body,
      recipientIds: recipients.map((r) => r.id),
      parentId: (mode === 'reply' && initial) ? initial.id : null,
      category,
    });
    setSending(false);

    if (res.ok) {
      toast.success('메일이 전송되었습니다.');
      clearDraft();
      closeCompose();
    } else {
      toast.error(res.error);
    }
  };

  const handleClose = () => {
    if (mode === 'new' && (subject.trim() || body.trim() || recipients.length > 0)) {
      /* 자동으로 드래프트는 이미 저장됨 — 그냥 안내만 */
      toast.info('💾 임시 저장됐어요. 다음에 이어서 작성할 수 있어요.');
    }
    closeCompose();
  };

  const title = mode === 'reply'   ? '답장'
              : mode === 'forward' ? '전달'
              : '새 메일';

  /* 모달 헤더에 자동저장 인디케이터 추가 */
  const headerExtra = mode === 'new' && draftSaved ? (
    <span className="mail-draft-saved">
      <i className="fa-solid fa-cloud-arrow-up" /> 임시 저장됨
    </span>
  ) : null;

  return (
    <Modal isOpen={open} onClose={handleClose} size="md" title={title} headerExtra={headerExtra}>
      <div className="mail-compose">
        {/* 수신자 */}
        <label className="mail-compose-label">받는 사람</label>
        <div className="mail-compose-recipients">
          {recipients.map((r) => (
            <span key={r.id} className="mail-recipient-chip">
              <div
                className="mail-recipient-avatar"
                style={{ backgroundImage: `url('${avatarUrl(r)}')` }}
              />
              {r.full_name}
              <button type="button" onClick={() => removeRecipient(r.id)} title="제거">
                <i className="fa-solid fa-xmark" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={recipientSearch}
            onChange={(e) => setRecipientSearch(e.target.value)}
            placeholder={recipients.length === 0 ? '이름 또는 부서로 검색...' : '추가...'}
            className="mail-recipient-input"
          />
        </div>

        {/* 후보 드롭다운 */}
        {candidates.length > 0 && (
          <div className="mail-recipient-dropdown">
            {candidates.map((u) => (
              <button
                key={u.id}
                type="button"
                className="mail-recipient-option"
                onClick={() => addRecipient(u)}
              >
                <div
                  className="mail-recipient-avatar"
                  style={{ backgroundImage: `url('${avatarUrl(u)}')` }}
                />
                <div className="mail-recipient-info">
                  <strong>{u.full_name}</strong>
                  {u.department && <span> · {u.department}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 🔥 자주 보내는 사람 — 검색 안 할 때만, 새 메일 모드만 */}
        {!recipientSearch && mode === 'new' && frequentRecipients.length > 0 && (
          <div className="mail-frequent">
            <span className="mail-frequent-label">
              <i className="fa-solid fa-fire" /> 자주 보내는 사람
            </span>
            <div className="mail-frequent-list">
              {frequentRecipients
                .filter((u) => !recipients.some((r) => r.id === u.id))
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="mail-frequent-chip"
                    onClick={() => addRecipient(u)}
                  >
                    <div
                      className="mail-recipient-avatar"
                      style={{ backgroundImage: `url('${avatarUrl(u)}')`, width: 18, height: 18 }}
                    />
                    {u.full_name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* 카테고리 */}
        <label className="mail-compose-label">카테고리</label>
        <div className="mail-compose-categories">
          {MAIL_CATEGORIES.map((c) => {
            const isActive = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={`mail-compose-cat ${isActive ? 'active' : ''}`}
                onClick={() => setCategory(c.id)}
                style={isActive ? {
                  background: `${c.color}1a`,
                  borderColor: c.color,
                  color: c.color,
                } : undefined}
                title={c.desc}
              >
                <i className={`fa-solid ${c.icon}`} style={{ color: isActive ? c.color : undefined }} />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* 제목 */}
        <label className="mail-compose-label">제목</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="제목을 입력하세요"
          className="mail-compose-subject"
        />

        {/* 본문 */}
        <label className="mail-compose-label">본문</label>

        {/* 🆕 서식 툴바 */}
        <div className="mail-compose-toolbar">
          <button type="button" onClick={() => insertAround('**', '**')} title="굵게">
            <i className="fa-solid fa-bold" />
          </button>
          <button type="button" onClick={() => insertAround('*', '*')} title="기울임">
            <i className="fa-solid fa-italic" />
          </button>
          <button type="button" onClick={() => insertAround('__', '__')} title="밑줄">
            <i className="fa-solid fa-underline" />
          </button>
          <span className="mail-compose-toolbar-sep" />
          <button type="button" onClick={() => insertAtLineStart('- ')} title="목록">
            <i className="fa-solid fa-list-ul" />
          </button>
          <button type="button" onClick={() => insertAtLineStart('1. ')} title="번호 목록">
            <i className="fa-solid fa-list-ol" />
          </button>
          <button type="button" onClick={() => insertAtLineStart('> ')} title="인용">
            <i className="fa-solid fa-quote-right" />
          </button>
          <span className="mail-compose-toolbar-sep" />
          <button type="button" onClick={insertLink} title="링크">
            <i className="fa-solid fa-link" />
          </button>
          <button type="button" onClick={handleAttachClick} title="첨부">
            <i className="fa-solid fa-paperclip" />
          </button>
        </div>

        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="내용을 작성하세요..."
          className="mail-compose-body"
          rows={12}
        />

        {/* 🆕 첨부 영역 — UI 만 */}
        {attachments.length > 0 && (
          <div className="mail-compose-attach-list">
            {attachments.map((a) => (
              <div key={a.id} className="mail-compose-attach-chip">
                <i className="fa-solid fa-paperclip" />
                <span>{a.name}</span>
                <span className="mail-compose-attach-size">{a.size} KB</span>
                <button type="button" onClick={() => removeAttachment(a.id)} title="제거">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={handleClose} disabled={sending}>
          취소
        </button>
        &nbsp;
        <button type="button" className="btn btn-in" onClick={handleSend} disabled={sending}>
          {sending ? '전송 중...' : <><i className="fa-solid fa-paper-plane" /> 전송</>}
        </button>
      </div>
    </Modal>
  );
}

/* ──────────────────────────────────────────────
   localStorage 드래프트 헬퍼
   ────────────────────────────────────────────── */
function saveDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('[Mail] draft save failed', e);
  }
}
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}