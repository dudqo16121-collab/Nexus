// 메일 본문 패널 — 풍부화 버전.
// 카테고리 칩 / 발신자 카드 / 첨부 / 스레드 / 인라인 답장.

import { useState, useEffect } from 'react';
import { useMail } from '../../contexts/MailContext';
import { useToast } from '../../contexts/ToastContext';
import { getCategoryMeta } from '../../config/mailCategories';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

/* 본문에서 첨부 키워드를 감지해서 가짜 파일 리스트 만들기.
   (실제 첨부 테이블 연동은 다음 단계에서) */
function detectAttachments(body) {
  if (!body) return [];
  const matches = body.match(/첨부[^.\n]*?[:：]\s*([^\n]+)/gi);
  if (!matches) return [];
  const files = [];
  matches.forEach((m) => {
    const after = m.split(/[:：]/)[1] || '';
    after.split(/[,，\s]+/).forEach((name) => {
      const n = name.trim().replace(/[()]/g, '');
      if (n && /\.[a-z0-9]{2,5}$/i.test(n)) {
        files.push({ name: n, size: Math.floor(Math.random() * 500 + 50) });
      }
    });
  });
  return files;
}

function getFileIcon(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['pdf'].includes(ext)) return { icon: 'fa-file-pdf', color: '#f72585' };
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: '#06d6a0' };
  if (['docx', 'doc'].includes(ext)) return { icon: 'fa-file-word', color: '#4361ee' };
  if (['pptx', 'ppt'].includes(ext)) return { icon: 'fa-file-powerpoint', color: '#ff9f1c' };
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { icon: 'fa-file-image', color: '#8338ec' };
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: 'fa-file-zipper', color: '#94a3b8' };
  return { icon: 'fa-file', color: '#64748b' };
}

export default function MailDetail() {
  const {
    selectedMail,
    allUsers,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    openCompose,
    folder,
    fetchThread,
    quickReply,
  } = useMail();
  const toast = useToast();

  const [thread, setThread] = useState([]);
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  /* 메일 바뀔 때 스레드 로드 */
  useEffect(() => {
    if (!selectedMail) {
      setThread([]);
      setReplyOpen(false);
      setReplyBody('');
      return;
    }
    let cancelled = false;
    fetchThread(selectedMail).then((data) => {
      if (!cancelled) setThread(data);
    });
    return () => { cancelled = true; };
  }, [selectedMail?.id, fetchThread]);

  if (!selectedMail) {
    return (
      <section className="mail-detail mail-detail-empty">
        <div>
          <i className="fa-regular fa-envelope" />
          <p>왼쪽 목록에서 메일을 선택하세요</p>
        </div>
      </section>
    );
  }

  const findUser = (id) => allUsers.find((u) => u.id === id);
  const m = selectedMail.message;
  const sender = findUser(m?.sender_id);
  const recipients = selectedMail.kind === 'sent'
    ? (selectedMail.recipients || []).map((r) => findUser(r.user_id)).filter(Boolean)
    : null;

  const catMeta = getCategoryMeta(m?.category || 'general');
  const attachments = detectAttachments(m?.body);

  const handleReply = () => {
    if (selectedMail.kind === 'sent') return;
    setReplyOpen(true);
  };
  const handleFullReply = () => {
    if (selectedMail.kind === 'sent') return;
    openCompose('reply', m);
  };
  const handleForward = () => openCompose('forward', m);

  const handleTrash = async () => {
    if (selectedMail.kind === 'sent') {
      toast.info('보낸편지함의 메일은 삭제할 수 없어요.');
      return;
    }
    const res = await moveToTrash(selectedMail.recipientId);
    if (res.ok) toast.success('휴지통으로 옮겼어요.');
    else toast.error(res.error);
  };
  const handleRestore = async () => {
    const res = await restoreFromTrash(selectedMail.recipientId);
    if (res.ok) toast.success('받은편지함으로 복원했어요.');
    else toast.error(res.error);
  };
  const handlePermDelete = async () => {
    if (!window.confirm('이 메일을 영구 삭제하시겠습니까? 복구할 수 없어요.')) return;
    const res = await permanentDelete(selectedMail.recipientId);
    if (res.ok) toast.success('영구 삭제했어요.');
    else toast.error(res.error);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleQuickSend = async () => {
    if (!replyBody.trim()) {
      toast.warning('내용을 입력해주세요.');
      return;
    }
    setSending(true);
    const res = await quickReply(selectedMail, replyBody);
    setSending(false);
    if (res.ok) {
      toast.success('답장을 보냈어요.');
      setReplyBody('');
      setReplyOpen(false);
    } else {
      toast.error(res.error || '답장 전송 실패');
    }
  };

  return (
    <section className="mail-detail">
      {/* ── 헤더 ── */}
      <div className="mail-detail-header">
        <div className="mail-detail-title-area">
          {/* 카테고리 칩 */}
          <span
            className="mail-detail-cat-chip"
            style={{ background: `${catMeta.color}1a`, color: catMeta.color }}
          >
            <i className={`fa-solid ${catMeta.icon}`} /> {catMeta.label}
          </span>
          <h2 className="mail-detail-subject">{m?.subject || '(제목 없음)'}</h2>
        </div>

        <div className="mail-detail-actions">
          {selectedMail.kind === 'inbox' && folder !== 'trash' && (
            <>
              <button type="button" className="mail-icon-btn" onClick={handleReply} title="답장">
                <i className="fa-solid fa-reply" />
              </button>
              <button type="button" className="mail-icon-btn" onClick={handleForward} title="전달">
                <i className="fa-solid fa-share" />
              </button>
              <button type="button" className="mail-icon-btn" onClick={handlePrint} title="인쇄">
                <i className="fa-solid fa-print" />
              </button>
              <button type="button" className="mail-icon-btn danger" onClick={handleTrash} title="휴지통으로">
                <i className="fa-solid fa-trash" />
              </button>
            </>
          )}
          {folder === 'trash' && (
            <>
              <button type="button" className="mail-icon-btn" onClick={handleRestore} title="복원">
                <i className="fa-solid fa-rotate-left" />
              </button>
              <button type="button" className="mail-icon-btn danger" onClick={handlePermDelete} title="영구 삭제">
                <i className="fa-solid fa-trash-can" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 발신자 카드 ── */}
      <div className="mail-detail-meta">
        <div className="mail-detail-sender">
          <div
            className="mail-detail-avatar"
            style={{ backgroundImage: `url('${avatarUrl(sender)}')` }}
          />
          <div className="mail-detail-sender-info">
            <div className="mail-detail-sender-row1">
              <strong className="mail-detail-sender-name">
                {sender?.full_name || '알 수 없음'}
              </strong>
              {sender?.department && (
                <span className="mail-detail-sender-dept">{sender.department}</span>
              )}
            </div>
            {selectedMail.kind === 'sent' && recipients && recipients.length > 0 && (
              <div className="mail-detail-recipients">
                <i className="fa-solid fa-paper-plane" />
                받는 사람: {recipients.map((r) => r.full_name).join(', ')}
              </div>
            )}
            {selectedMail.kind === 'inbox' && (
              <div className="mail-detail-recipients">
                <i className="fa-solid fa-paper-plane" /> 받는 사람: 나
              </div>
            )}
          </div>
        </div>
        <div className="mail-detail-time">
          <i className="fa-regular fa-clock" />
          {m?.created_at && new Date(m.created_at).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* ── 첨부파일 (있을 때만) ── */}
      {attachments.length > 0 && (
        <div className="mail-detail-attachments">
          <div className="mail-detail-attach-head">
            <i className="fa-solid fa-paperclip" />
            첨부파일 <span className="mail-detail-attach-count">{attachments.length}</span>
          </div>
          <div className="mail-detail-attach-list">
            {attachments.map((f, i) => {
              const meta = getFileIcon(f.name);
              return (
                <div key={i} className="mail-detail-attach-item">
                  <span
                    className="mail-detail-attach-icon"
                    style={{ background: `${meta.color}1a`, color: meta.color }}
                  >
                    <i className={`fa-solid ${meta.icon}`} />
                  </span>
                  <div className="mail-detail-attach-body">
                    <div className="mail-detail-attach-name">{f.name}</div>
                    <div className="mail-detail-attach-size">{f.size} KB</div>
                  </div>
                  <button
                    type="button"
                    className="mail-detail-attach-btn"
                    title="다운로드 (준비 중)"
                    onClick={() => toast.info('첨부파일 다운로드는 준비 중이에요.')}
                  >
                    <i className="fa-solid fa-download" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 본문 ── */}
      <div className="mail-detail-body">
        {(m?.body || '').split('\n').map((line, i) => (
          <p key={i}>{line || '\u00A0'}</p>
        ))}
      </div>

      {/* ── 이전 메일 (스레드) ── */}
      {thread.length > 0 && (
        <div className="mail-detail-thread">
          <button
            type="button"
            className="mail-detail-thread-toggle"
            onClick={() => setThreadExpanded((v) => !v)}
          >
            <i className="fa-regular fa-comments" />
            이전 메일 {thread.length}개
            <i className={`fa-solid fa-chevron-${threadExpanded ? 'up' : 'down'}`} />
          </button>
          {threadExpanded && (
            <div className="mail-detail-thread-list">
              {thread.map((t) => {
                const tSender = findUser(t.sender_id);
                return (
                  <div key={t.id} className="mail-detail-thread-item">
                    <div className="mail-detail-thread-head">
                      <div
                        className="mail-detail-thread-avatar"
                        style={{ backgroundImage: `url('${avatarUrl(tSender)}')` }}
                      />
                      <strong>{tSender?.full_name || '알 수 없음'}</strong>
                      <span className="mail-detail-thread-time">
                        {new Date(t.created_at).toLocaleString('ko-KR', {
                          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="mail-detail-thread-body">
                      {(t.body || '').slice(0, 200)}
                      {(t.body || '').length > 200 && '...'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 인라인 답장 ── */}
      {selectedMail.kind === 'inbox' && folder !== 'trash' && (
        <div className="mail-detail-quickreply">
          {!replyOpen ? (
            <button
              type="button"
              className="mail-quickreply-trigger"
              onClick={handleReply}
            >
              <i className="fa-solid fa-pen" />
              <span>빠른 답장 작성하기...</span>
              <span className="mail-quickreply-to">
                ↩ {sender?.full_name}
              </span>
            </button>
          ) : (
            <div className="mail-quickreply-form">
              <div className="mail-quickreply-head">
                <span>
                  <i className="fa-solid fa-reply" /> {sender?.full_name}님에게 답장
                </span>
                <button
                  type="button"
                  className="mail-quickreply-close"
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyBody('');
                  }}
                  title="닫기"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="답장을 입력하세요..."
                className="mail-quickreply-textarea"
                rows={4}
                autoFocus
              />
              <div className="mail-quickreply-actions">
                <button
                  type="button"
                  className="mail-quickreply-full"
                  onClick={handleFullReply}
                  title="전체 작성 모달 열기"
                >
                  <i className="fa-solid fa-up-right-from-square" /> 자세히 작성
                </button>
                <button
                  type="button"
                  className="mail-quickreply-send"
                  onClick={handleQuickSend}
                  disabled={sending || !replyBody.trim()}
                >
                  {sending ? (
                    <><i className="fa-solid fa-spinner fa-spin" /> 전송 중</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane" /> 답장 보내기</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}