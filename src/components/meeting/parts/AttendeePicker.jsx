// components/meeting/parts/AttendeePicker.jsx
// 참석자 표시 + 추가/제거.

import { useState, useMemo } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useProject } from '../../../contexts/ProjectContext';
import {
  ATTENDEE_ROLES, ATTENDEE_STATUSES,
} from '../../../config/meetingCanvasConfig';

export default function AttendeePicker() {
  const { user } = useAuth();
  const { current, addAttendee, removeAttendee, updateAttendeeStatus } = useMeetingCanvas();
  const { allUsers } = useProject();
  const toast = useToast();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  if (!current) return null;
  const { canvas, attendees } = current;
  const isHost = canvas.host_id === user?.id;

  const myAttendee = useMemo(
    () => attendees.find((a) => a.user_id === user?.id),
    [attendees, user?.id]
  );

  /* 추가 가능한 사용자 — 이미 참석자가 아닌 사람 */
  const candidates = useMemo(() => {
    const existingIds = new Set(attendees.map((a) => a.user_id));
    return (allUsers || [])
      .filter((u) => !existingIds.has(u.id))
      .filter((u) =>
        !search.trim() ||
        (u.name || '').toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 30);
  }, [allUsers, attendees, search]);

  const handleAdd = async (u) => {
    const res = await addAttendee(canvas.id, {
      user_id: u.id,
      user_name: u.name,
      role: 'attendee',
    });
    if (res.ok) {
      toast.success(`${u.name} 초대됨`);
      setSearch('');
    } else {
      toast.error(res.error);
    }
  };

  const handleRemove = async (a) => {
    if (a.role === 'host') {
      toast.warning('주최자는 제외할 수 없어요.');
      return;
    }
    if (!confirm(`${a.user_name}님을 제외할까요?`)) return;
    const res = await removeAttendee(canvas.id, a.id);
    if (!res.ok) toast.error(res.error);
  };

  const handleMyStatus = async (status) => {
    if (!myAttendee) return;
    const res = await updateAttendeeStatus(myAttendee.id, status);
    if (res.ok) toast.success('응답을 저장했어요');
    else toast.error(res.error);
  };

  const getStatusMeta = (s) => ATTENDEE_STATUSES.find((x) => x.value === s) || ATTENDEE_STATUSES[0];
  const getRoleMeta = (r) => ATTENDEE_ROLES.find((x) => x.value === r) || ATTENDEE_ROLES[1];

  const accepted = attendees.filter((a) => a.status === 'accepted').length;
  const declined = attendees.filter((a) => a.status === 'declined').length;
  const pending = attendees.filter((a) => a.status === 'pending').length;

  return (
    <section className="mc-section">
      <div className="mc-section-head">
        <h3>
          <i className="fa-solid fa-users" style={{ color: '#4361ee' }} />
          참석자 ({attendees.length})
        </h3>
        <div className="mc-section-meta">
          <span style={{ color: '#06d6a0' }}>✓ {accepted}</span>
          <span style={{ color: '#f72585' }}>✕ {declined}</span>
          <span style={{ color: '#94a3b8' }}>· {pending} 대기</span>
        </div>
      </div>

      {/* 내 응답 상태 (host 아닌 경우만) */}
      {myAttendee && myAttendee.role !== 'host' && (
        <div className="mc-my-rsvp">
          <span className="mc-my-rsvp-label">참석하시나요?</span>
          <div className="mc-rsvp-buttons">
            <button
              type="button"
              className={`mc-rsvp-btn ${myAttendee.status === 'accepted' ? 'selected accepted' : ''}`}
              onClick={() => handleMyStatus('accepted')}
            >
              <i className="fa-solid fa-check" /> 참석
            </button>
            <button
              type="button"
              className={`mc-rsvp-btn ${myAttendee.status === 'declined' ? 'selected declined' : ''}`}
              onClick={() => handleMyStatus('declined')}
            >
              <i className="fa-solid fa-xmark" /> 불참
            </button>
          </div>
        </div>
      )}

      {/* 참석자 칩 */}
      <div className="mc-attendee-chips">
        {attendees.map((a) => {
          const statMeta = getStatusMeta(a.status);
          const roleMeta = getRoleMeta(a.role);
          return (
            <div
              key={a.id}
              className="mc-attendee-chip"
              title={`${roleMeta.label} · ${statMeta.label}`}
            >
              <span className="mc-attendee-avatar"
                style={{ background: `${statMeta.color}20`, color: statMeta.color }}>
                {(a.user_name || '?').slice(0, 1)}
              </span>
              <span className="mc-attendee-name">
                {a.user_name}
                {a.role === 'host' && <i className="fa-solid fa-crown mc-host-icon" title="주최자" />}
              </span>
              <span className="mc-attendee-status" style={{ color: statMeta.color }}>
                {a.status === 'accepted' && '✓'}
                {a.status === 'declined' && '✕'}
                {a.status === 'pending' && '·'}
              </span>
              {isHost && a.role !== 'host' && (
                <button
                  type="button"
                  className="mc-attendee-remove"
                  onClick={() => handleRemove(a)}
                  title="제외"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          );
        })}

        {/* + 추가 버튼 */}
        {isHost && (
          <button
            type="button"
            className="mc-attendee-add-btn"
            onClick={() => setPickerOpen((v) => !v)}
          >
            <i className="fa-solid fa-plus" /> 초대
          </button>
        )}
      </div>

      {/* 사용자 검색 picker */}
      {pickerOpen && isHost && (
        <div className="mc-attendee-picker">
          <input
            type="text"
            placeholder="이름으로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mc-picker-input"
            autoFocus
          />
          <div className="mc-picker-list">
            {candidates.length === 0 ? (
              <div className="mc-picker-empty">
                {search ? '검색 결과 없음' : '추가할 사용자가 없어요'}
              </div>
            ) : (
              candidates.map((u) => (
                <button
                  type="button"
                  key={u.id}
                  className="mc-picker-item"
                  onClick={() => handleAdd(u)}
                >
                  <span className="mc-picker-avatar">
                    {(u.name || '?').slice(0, 1)}
                  </span>
                  <span>{u.name}</span>
                  <i className="fa-solid fa-plus mc-picker-plus" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}