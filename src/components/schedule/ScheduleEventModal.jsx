// components/schedule/ScheduleEventModal.jsx
// 일정 생성/수정 모달 — 반복 + 초대 + 카테고리 + 회의실 연동.

import { useEffect, useState, useMemo } from 'react';
import Modal from '../common/Modal';
import {
  useSchedule, CATEGORIES, RECURRENCE_FREQS, INVITATION_STATUS,
} from '../../contexts/ScheduleContext';
import { useToast } from '../../contexts/ToastContext';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMeetingRoom } from '../../contexts/MeetingRoomContext';
import { TIME_SLOTS } from '../../config/meetingRoomConfig';
import DateTimePicker from '../common/DateTimePicker';

/* Date → "YYYY-MM-DDTHH:MM" */
function toLocalInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toDateInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ScheduleEventModal() {
  const { user } = useAuth();
  const {
    eventModal,
    closeEventModal,
    createEvent,
    updateEvent,
    deleteEvent,
    canEdit,
    invitationsByEvent,
  } = useSchedule();
  const toast = useToast();

  /* 동료 목록 (초대용) */
  let members = [];
  try {
    const orgCtx = useOrgChart();
    members = orgCtx?.members || [];
  } catch {
    members = [];
  }

  /* 회의실 연동 */
  const {
    findAvailableRooms,
    createBookingForSchedule,
    deleteBookingForSchedule,
  } = useMeetingRoom();

  const { open, event, defaultDate } = eventModal;
  const isEdit = !!event;
  const editable = !event || canEdit(event);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'meeting',
    all_day: false,
    start_at: '',
    end_at: '',
    /* 반복 */
    recurrence_freq: 'none',
    recurrence_until: '',
    /* 초대 */
    invitees: [],
  });

  const [saving, setSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  /* 회의실 상태 */
  const [roomId, setRoomId] = useState(null);
  const [originalRoomBookingId, setOriginalRoomBookingId] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [roomConflicts, setRoomConflicts] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(false);

/* 열릴 때 초기화 */
  useEffect(() => {
    if (!open) return;
    if (event) {
      const rule = event.recurrence_rule || {};
      const existingInvs = invitationsByEvent(event.id);

      setForm({
        title: event.title || '',
        description: event.description || '',
        category: event.category || 'meeting',
        all_day: !!event.all_day,
        // ISO 그대로 사용
        start_at: event.all_day ? toDateInput(event.start_at) : event.start_at,
        end_at: event.all_day 
          ? toDateInput(event.end_at || event.start_at) 
          : (event.end_at || event.start_at),
        recurrence_freq: rule.freq || 'none',
        recurrence_until: rule.until ? toDateInput(rule.until) : '',
        invitees: existingInvs.map((inv) => inv.invitee_id),
      });
      setOriginalRoomBookingId(event.room_booking_id || null);
      setRoomId(event.room_booking_id ? null : null);
    } else {
      /* 새 일정 */
      const start = defaultDate ? new Date(defaultDate) : new Date();
      if (!defaultDate || start.getHours() === 0) {
        start.setHours(new Date().getHours() + 1, 0, 0, 0);
      }
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      setForm({
        title: '',
        description: '',
        category: 'meeting',
        all_day: false,
        start_at: start.toISOString(), // ISO
        end_at: end.toISOString(),     // ISO
        recurrence_freq: 'none',
        recurrence_until: '',
        invitees: [],
      });
      setOriginalRoomBookingId(null);
      setRoomId(null);
    }
    setMemberSearch('');
    setShowMemberPicker(false);
    setAvailableRooms([]);
    setAllRooms([]);
    setRoomConflicts({});
  }, [open, event, defaultDate, invitationsByEvent]);

  /* 기존 회의실 예약 정보 로드 — 수정 모드일 때 roomId 자동 선택 */
  useEffect(() => {
    if (!open || !originalRoomBookingId || allRooms.length === 0) return;
    /* roomConflicts 안에 본인 예약이 있으면 그 회의실이 선택된 상태로 보여줘야 함 */
    const myConflictEntry = Object.entries(roomConflicts).find(
      ([, b]) => b.id === originalRoomBookingId
    );
    if (myConflictEntry && !roomId) {
      setRoomId(myConflictEntry[0]);
    }
  }, [open, originalRoomBookingId, allRooms, roomConflicts, roomId]);

  /* 회의 카테고리 + 시간 입력 완료 시 회의실 가용성 조회 */
  useEffect(() => {
    if (!open) return;
    if (form.category !== 'meeting') {
      setAvailableRooms([]);
      setAllRooms([]);
      setRoomConflicts({});
      setRoomId(null);
      return;
    }
    if (!form.start_at) return;

    if (form.all_day) {
      setAvailableRooms([]);
      setAllRooms([]);
      return;
    }

    const startDate = new Date(form.start_at);
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
    const timeSlot = `${pad(startDate.getHours())}:00`;

    if (!TIME_SLOTS.includes(timeSlot)) {
      setAvailableRooms([]);
      setAllRooms([]);
      return;
    }

    let cancelled = false;
    setLoadingRooms(true);
    findAvailableRooms(dateStr, timeSlot).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setAvailableRooms(res.rooms || []);
        setAllRooms(res.allRooms || []);
        const conflicts = {};
        for (const b of (res.bookings || [])) {
          if (b.time_slot === timeSlot) {
            conflicts[b.room_id] = b;
          }
        }
        setRoomConflicts(conflicts);
      } else {
        setAvailableRooms([]);
        setAllRooms([]);
      }
      setLoadingRooms(false);
    });

    return () => { cancelled = true; };
  }, [open, form.category, form.start_at, form.all_day, findAvailableRooms]);

  const patch = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

const toggleAllDay = (checked) => {
    setForm((prev) => {
      if (checked) {
        /* 종일 — date 문자열만 */
        const startDate = prev.start_at ? new Date(prev.start_at) : new Date();
        const endDate = prev.end_at ? new Date(prev.end_at) : startDate;
        return {
          ...prev,
          all_day: true,
          start_at: toDateInput(startDate),
          end_at: toDateInput(endDate),
        };
      }
      /* 시간 일정 — ISO */
      const s = prev.start_at ? new Date(prev.start_at + 'T09:00') : new Date();
      const e = new Date(s); e.setHours(s.getHours() + 1);
      return {
        ...prev,
        all_day: false,
        start_at: s.toISOString(),
        end_at: e.toISOString(),
      };
    });
  };

  /* 초대자 토글 */
  const toggleInvitee = (userId) => {
    if (userId === user?.id) return;
    setForm((prev) => ({
      ...prev,
      invitees: prev.invitees.includes(userId)
        ? prev.invitees.filter((id) => id !== userId)
        : [...prev.invitees, userId],
    }));
  };

  const filteredMembers = useMemo(() => {
    const list = members.filter((m) => m.id !== user?.id);
    if (!memberSearch.trim()) return list;
    const q = memberSearch.trim().toLowerCase();
    return list.filter(
      (m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q) ||
        (m.rank || '').toLowerCase().includes(q)
    );
  }, [members, memberSearch, user]);

  const selectedMembers = useMemo(
    () => members.filter((m) => form.invitees.includes(m.id)),
    [members, form.invitees]
  );

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }
    if (!form.start_at || !form.end_at) {
      toast.warning('시작/종료 일시를 입력해주세요.');
      return;
    }

    const cat = CATEGORIES.find((c) => c.id === form.category);

    /* 반복 규칙 */
    let recurrence = null;
    if (form.recurrence_freq !== 'none') {
      recurrence = {
        freq: form.recurrence_freq,
        interval: 1,
        until: form.recurrence_until || null,
      };
    }

    setSaving(true);

    /* 1) 일정 저장 */
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      color: cat?.color || '#4361ee',
      all_day: form.all_day,
      start_at: form.all_day 
        ? `${form.start_at}T00:00:00` 
        : form.start_at,  // 이미 ISO
      end_at: form.all_day 
        ? `${form.end_at}T23:59:59` 
        : form.end_at,  // 이미 ISO
      recurrence,
      invitees: form.invitees,
    };

    const res = isEdit
      ? await updateEvent(event.id, payload)
      : await createEvent(payload);

    if (!res.ok) {
      setSaving(false);
      toast.error(res.error);
      return;
    }

    const savedEvent = res.event;
    let bookingChanged = false;
    let bookingWarning = null;

    /* 2) 회의실 예약 처리 */
    if (form.category === 'meeting' && !form.all_day) {
      const startDate = new Date(savedEvent.start_at);
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
      const timeSlot = `${pad(startDate.getHours())}:00`;

      const needsNewBooking = !!roomId;
      const needsCleanup = originalRoomBookingId && !needsNewBooking;
      const isBookingChanged = originalRoomBookingId && needsNewBooking;

      /* (a) 기존 예약 취소가 필요한 경우 */
      if (needsCleanup || isBookingChanged) {
        await deleteBookingForSchedule(originalRoomBookingId);
        bookingChanged = true;
      }

      /* (b) 새 예약 생성 */
      if (needsNewBooking && TIME_SLOTS.includes(timeSlot)) {
        const bookRes = await createBookingForSchedule({
          roomId,
          date: dateStr,
          timeSlot,
          reason: form.title.trim(),
          scheduleEventId: savedEvent.id,
        });

        if (bookRes.ok) {
          await updateEvent(savedEvent.id, { room_booking_id: bookRes.booking.id });
          bookingChanged = true;
        } else {
          bookingWarning = `회의실 예약 실패: ${bookRes.error}`;
        }
      } else if (!needsNewBooking && originalRoomBookingId) {
        await updateEvent(savedEvent.id, { room_booking_id: null });
      }
    } else if (originalRoomBookingId) {
      /* 카테고리가 회의가 아니거나 종일로 바뀜 — 기존 예약 정리 */
      await deleteBookingForSchedule(originalRoomBookingId);
      await updateEvent(savedEvent.id, { room_booking_id: null });
      bookingChanged = true;
    }

    setSaving(false);

    if (bookingWarning) {
      toast.warning(bookingWarning);
    } else {
      const baseMsg = isEdit ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.';
      toast.success(
        bookingChanged ? `${baseMsg} 회의실 예약도 동기화됐어요.` : baseMsg
      );
    }
    closeEventModal();
  };

  const handleDelete = async () => {
    if (!event || !window.confirm('이 일정을 삭제하시겠습니까?\n반복 일정이라면 모든 인스턴스가 삭제돼요.')) return;
    setSaving(true);

    /* 연결된 회의실 예약도 같이 삭제 */
    if (originalRoomBookingId) {
      await deleteBookingForSchedule(originalRoomBookingId);
    }

    const res = await deleteEvent(event.id);
    setSaving(false);
    if (res.ok) {
      toast.success(
        originalRoomBookingId
          ? '일정과 회의실 예약이 삭제되었습니다.'
          : '일정이 삭제되었습니다.'
      );
      closeEventModal();
    } else {
      toast.error(res.error);
    }
  };

  /* 기존 초대자 응답 현황 (수정 모드일 때) */
  const existingInvitations = useMemo(() => {
    if (!event) return [];
    return invitationsByEvent(event.id);
  }, [event, invitationsByEvent]);

  /* 시간 슬롯 미리계산 — UI 표시용 */
  const currentTimeSlot = useMemo(() => {
    if (!form.start_at || form.all_day) return null;
    const startDate = new Date(form.start_at);
    if (isNaN(startDate.getTime())) return null;
    const pad = (n) => String(n).padStart(2, '0');
    const slot = `${pad(startDate.getHours())}:00`;
    return TIME_SLOTS.includes(slot) ? slot : null;
  }, [form.start_at, form.all_day]);

  return (
    <Modal
      isOpen={open}
      onClose={closeEventModal}
      size="md"
      title={
        isEdit ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {!editable && (
              <i
                className="fa-solid fa-eye"
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}
                title="읽기 전용"
              />
            )}
            {editable ? '일정 수정' : '일정 보기'}
          </span>
        ) : '새 일정'
      }
    >
      <div className="pm-form schedule-modal-form">
        {/* 제목 */}
        <label>제목 <span className="req">*</span></label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => patch('title', e.target.value)}
          placeholder="일정 제목"
          disabled={!editable}
        />

        {/* 카테고리 */}
        <label>카테고리</label>
        <div className="schedule-category-picker">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`schedule-cat-chip ${form.category === c.id ? 'active' : ''}`}
              style={{
                background: form.category === c.id ? c.color : 'transparent',
                borderColor: c.color,
                color: form.category === c.id ? '#fff' : c.color,
              }}
              onClick={() => editable && patch('category', c.id)}
              disabled={!editable}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 종일 토글 */}
        <label className="pm-check">
          <input
            type="checkbox"
            checked={form.all_day}
            onChange={(e) => editable && toggleAllDay(e.target.checked)}
            disabled={!editable}
          />
          <span>종일 일정</span>
        </label>

{/* 시작/종료 */}
        <div className="pm-form-row">
          <div>
            <label>시작</label>
            <DateTimePicker
              value={form.start_at}
              dateOnly={form.all_day}
              disabled={!editable}
              onChange={(newVal) => {
                /* 시작 변경 시 종료가 시작보다 빠르면 1시간 후로 자동 보정 */
                setForm((prev) => {
                  const next = { ...prev, start_at: newVal };
                  if (!prev.all_day) {
                    const newStart = new Date(newVal);
                    const oldEnd = prev.end_at ? new Date(prev.end_at) : null;
                    if (!oldEnd || oldEnd <= newStart) {
                      const autoEnd = new Date(newStart);
                      autoEnd.setHours(autoEnd.getHours() + 1);
                      next.end_at = autoEnd.toISOString();
                    }
                  }
                  return next;
                });
              }}
            />
          </div>
          <div>
            <label>종료</label>
            <DateTimePicker
              value={form.end_at}
              dateOnly={form.all_day}
              disabled={!editable}
              onChange={(newVal) => patch('end_at', newVal)}
              minDate={form.start_at}
            />
          </div>
        </div>

        {/* ─── 반복 ─── */}
        <div className="schedule-section">
          <label className="schedule-section-label">
            <i className="fa-solid fa-repeat" /> 반복
          </label>
          <div className="schedule-recurrence-grid">
            {RECURRENCE_FREQS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`schedule-recurrence-btn ${form.recurrence_freq === r.id ? 'active' : ''}`}
                onClick={() => editable && patch('recurrence_freq', r.id)}
                disabled={!editable}
              >
                {r.label}
              </button>
            ))}
          </div>
          {form.recurrence_freq !== 'none' && (
            <div className="schedule-recurrence-until">
              <label>종료일 <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(선택 — 비우면 무기한)</span></label>
              <input
                type="date"
                value={form.recurrence_until}
                onChange={(e) => patch('recurrence_until', e.target.value)}
                min={toDateInput(new Date())}
                disabled={!editable}
              />
            </div>
          )}
        </div>

        {/* ─── 회의실 (회의 카테고리일 때만) ─── */}
        {form.category === 'meeting' && !form.all_day && (
          <div className="schedule-section">
            <label className="schedule-section-label">
              <i className="fa-solid fa-door-open" /> 회의실 예약
              {currentTimeSlot && (
                <span className="schedule-room-slot-info">
                  {currentTimeSlot} 슬롯 기준
                </span>
              )}
            </label>

            {!form.start_at ? (
              <div className="schedule-room-empty">
                시작 시간을 먼저 선택해주세요
              </div>
            ) : !currentTimeSlot ? (
              <div className="schedule-room-empty">
                회의실 예약은 09:00~17:00 시간대만 가능해요
              </div>
            ) : loadingRooms ? (
              <div className="schedule-room-empty">
                <i className="fa-solid fa-spinner fa-spin" /> 회의실 조회 중...
              </div>
            ) : allRooms.length === 0 ? (
              <div className="schedule-room-empty">
                등록된 회의실이 없습니다
              </div>
            ) : (
              <div className="schedule-room-list">
                {/* "예약 안 함" 옵션 */}
                <button
                  type="button"
                  className={`schedule-room-option ${!roomId ? 'selected' : ''}`}
                  onClick={() => editable && setRoomId(null)}
                  disabled={!editable}
                >
                  <div className="schedule-room-option-info">
                    <i className="fa-solid fa-ban" style={{ color: 'var(--text-muted)' }} />
                    <strong>회의실 예약 안 함</strong>
                  </div>
                </button>

                {/* 사용 가능한 회의실 */}
                {availableRooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`schedule-room-option available ${roomId === r.id ? 'selected' : ''}`}
                    onClick={() => editable && setRoomId(r.id)}
                    disabled={!editable}
                  >
                    <div className="schedule-room-option-info">
                      <i className="fa-solid fa-door-open" style={{ color: '#06d6a0' }} />
                      <div>
                        <strong>{r.name}</strong>
                        <span>정원 {r.capacity}명</span>
                      </div>
                    </div>
                    <span className="schedule-room-tag available">
                      <i className="fa-solid fa-check-circle" /> 예약 가능
                    </span>
                  </button>
                ))}

                {/* 예약된 회의실 (비활성, 내가 예약한 건 선택 가능하게) */}
                {allRooms
                  .filter((r) => !availableRooms.find((ar) => ar.id === r.id))
                  .map((r) => {
                    const conflict = roomConflicts[r.id];
                    const isMineExisting = conflict && conflict.id === originalRoomBookingId;
                    
                    if (isMineExisting) {
                      /* 본인이 이미 예약한 회의실 — 선택 가능 */
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className={`schedule-room-option mine ${roomId === r.id ? 'selected' : ''}`}
                          onClick={() => editable && setRoomId(r.id)}
                          disabled={!editable}
                        >
                          <div className="schedule-room-option-info">
                            <i className="fa-solid fa-door-open" style={{ color: '#4361ee' }} />
                            <div>
                              <strong>{r.name}</strong>
                              <span>정원 {r.capacity}명 · 내 예약</span>
                            </div>
                          </div>
                          <span className="schedule-room-tag mine">
                            <i className="fa-solid fa-bookmark" /> 내 예약
                          </span>
                        </button>
                      );
                    }

                    return (
                      <div key={r.id} className="schedule-room-option disabled">
                        <div className="schedule-room-option-info">
                          <i className="fa-solid fa-door-closed" style={{ color: '#94a3b8' }} />
                          <div>
                            <strong>{r.name}</strong>
                            <span>
                              {conflict ? `${conflict.user_name} · ${conflict.reason}` : '예약됨'}
                            </span>
                          </div>
                        </div>
                        <span className="schedule-room-tag booked">
                          <i className="fa-solid fa-lock" /> 예약됨
                        </span>
                      </div>
                    );
                  })}

                {availableRooms.length === 0 && allRooms.length > 0 && (
                  <div className="schedule-room-no-available">
                    <i className="fa-solid fa-triangle-exclamation" />
                    이 시간대에 예약 가능한 회의실이 없어요. 다른 시간을 선택해보세요.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── 참석자 초대 ─── */}
        <div className="schedule-section">
          <label className="schedule-section-label">
            <i className="fa-solid fa-user-plus" /> 참석자 초대
            {form.invitees.length > 0 && (
              <span className="schedule-invitee-count">{form.invitees.length}명</span>
            )}
          </label>

          {selectedMembers.length > 0 && (
            <div className="schedule-invitee-chips">
              {selectedMembers.map((m) => {
                const inv = existingInvitations.find((i) => i.invitee_id === m.id);
                const statusMeta = inv ? INVITATION_STATUS[inv.status] : null;
                return (
                  <div key={m.id} className="schedule-invitee-chip">
                    <div
                      className="schedule-invitee-avatar"
                      style={{
                        backgroundImage: `url('https://i.pravatar.cc/100?u=${m.id}')`,
                      }}
                    />
                    <span className="schedule-invitee-name">
                      {m.full_name}
                      {m.rank && <em>{m.rank}</em>}
                    </span>
                    {statusMeta && (
                      <span
                        className="schedule-invitee-status"
                        style={{ color: statusMeta.color }}
                        title={statusMeta.label}
                      >
                        <i className={`fa-solid ${statusMeta.icon}`} />
                      </span>
                    )}
                    {editable && (
                      <button
                        type="button"
                        className="schedule-invitee-remove"
                        onClick={() => toggleInvitee(m.id)}
                        title="제거"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {editable && (
            <button
              type="button"
              className="schedule-invitee-add-btn"
              onClick={() => setShowMemberPicker((v) => !v)}
            >
              <i className={`fa-solid ${showMemberPicker ? 'fa-chevron-up' : 'fa-plus'}`} />
              {showMemberPicker ? '닫기' : '동료 추가'}
            </button>
          )}

          {showMemberPicker && (
            <div className="schedule-member-picker">
              <input
                type="text"
                className="schedule-member-search"
                placeholder="이름·부서·직급으로 검색..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <div className="schedule-member-list">
                {filteredMembers.length === 0 ? (
                  <div className="schedule-member-empty">
                    <i className="fa-regular fa-face-frown" />
                    검색 결과가 없어요
                  </div>
                ) : (
                  filteredMembers.map((m) => {
                    const isSelected = form.invitees.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`schedule-member-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleInvitee(m.id)}
                      >
                        <div
                          className="schedule-member-avatar"
                          style={{
                            backgroundImage: `url('https://i.pravatar.cc/100?u=${m.id}')`,
                          }}
                        />
                        <div className="schedule-member-info">
                          <strong>{m.full_name}</strong>
                          <span>
                            {m.department}{m.rank && ` · ${m.rank}`}
                          </span>
                        </div>
                        {isSelected && (
                          <i className="fa-solid fa-check schedule-member-check" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 설명 */}
        <label>설명</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => patch('description', e.target.value)}
          placeholder="장소·준비물·메모 등"
          disabled={!editable}
        />
      </div>

      <div className="modal-buttons">
        {isEdit && editable && (
          <button
            type="button"
            className="btn btn-out"
            onClick={handleDelete}
            disabled={saving}
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            <i className="fa-solid fa-trash" /> 삭제
          </button>
        )}
        <button
          type="button"
          className="btn btn-out"
          onClick={closeEventModal}
          disabled={saving}
        >
          취소
        </button>
        {editable && (
          <button
            type="button"
            className="btn btn-in"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
          </button>
        )}
      </div>
    </Modal>
  );
}