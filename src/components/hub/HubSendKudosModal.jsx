// 칭찬 보내기 모달.

import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useHub, KUDOS_TAGS } from '../../contexts/HubContext';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

function avatarUrl(u) {
  if (u?.avatar_url) return u.avatar_url;
  return `https://i.pravatar.cc/150?u=${u?.id || 'x'}`;
}

export default function HubSendKudosModal() {
  const { sendKudosModal, closeSendKudos, sendKudos } = useHub();
  const { members } = useOrgChart() || { members: [] };
  const { user } = useAuth();
  const toast = useToast();
  const { open, presetTarget } = sendKudosModal;

  const [target, setTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('thanks');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (presetTarget) {
      setTarget(members.find((u) => u.id === presetTarget) || null);
    } else {
      setTarget(null);
    }
    setSearch('');
    setTag('thanks');
    setMessage('');
  }, [open, presetTarget, members]);

  const candidates = !search.trim()
    ? []
    : members
        .filter((u) => u.id !== user?.id)
        .filter((u) =>
          (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (u.department || '').toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 6);

  const handleSend = async () => {
    if (!target) {
      toast.warning('받는 사람을 선택해주세요.');
      return;
    }
    if (!message.trim()) {
      toast.warning('칭찬 메시지를 입력해주세요.');
      return;
    }
    setSending(true);
    const res = await sendKudos({ toId: target.id, tag, message: message.trim() });
    setSending(false);
    if (res.ok) {
      toast.success('칭찬을 보냈어요! 💛');
      closeSendKudos();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeSendKudos} size="sm" title="칭찬 보내기">
      <div className="hub-send-kudos">
        {/* 받는 사람 */}
        <label className="hub-send-label">받는 사람</label>
        {target ? (
          <div className="hub-send-target">
            <div
              className="hub-send-target-avatar"
              style={{ backgroundImage: `url('${avatarUrl(target)}')` }}
            />
            <div className="hub-send-target-info">
              <strong>{target.full_name}</strong>
              <span>{target.department || '-'}</span>
            </div>
            <button type="button" className="hub-send-target-clear" onClick={() => setTarget(null)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 부서로 검색..."
              className="hub-send-search"
            />
            {candidates.length > 0 && (
              <div className="hub-send-dropdown">
                {candidates.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="hub-send-option"
                    onClick={() => { setTarget(u); setSearch(''); }}
                  >
                    <div
                      className="hub-send-option-avatar"
                      style={{ backgroundImage: `url('${avatarUrl(u)}')` }}
                    />
                    <div>
                      <strong>{u.full_name}</strong>
                      <span>{u.department || '-'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* 태그 */}
        <label className="hub-send-label">어떤 칭찬을 보낼까요?</label>
        <div className="hub-send-tags">
          {KUDOS_TAGS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`hub-send-tag ${tag === t.id ? 'active' : ''}`}
              style={{
                background: tag === t.id ? t.color : 'transparent',
                borderColor: t.color,
                color: tag === t.id ? '#fff' : t.color,
              }}
              onClick={() => setTag(t.id)}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        {/* 메시지 */}
        <label className="hub-send-label">메시지</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="구체적인 이유를 적으면 더 감동적이에요 ✨"
          className="hub-send-message"
        />

        <p className="hub-send-note">
          <i className="fa-solid fa-circle-info" /> 칭찬을 보내면 받는 분은 +10 P 를 얻어요.
        </p>
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeSendKudos} disabled={sending}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={handleSend} disabled={sending}>
          {sending ? '보내는 중...' : <><i className="fa-solid fa-paper-plane" /> 칭찬 보내기</>}
        </button>
      </div>
    </Modal>
  );
}