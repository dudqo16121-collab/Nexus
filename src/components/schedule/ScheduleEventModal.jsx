// 일정 생성/수정 모달.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useSchedule, CATEGORIES } from '../../contexts/ScheduleContext';
import { useToast } from '../../contexts/ToastContext';

/* Date → "YYYY-MM-DDTHH:MM" (datetime-local input 호환) */
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
  const {
    eventModal,
    closeEventModal,
    createEvent,
    updateEvent,
    deleteEvent,
    canEdit,
  } = useSchedule();
  const toast = useToast();

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
  });
  const [saving, setSaving] = useState(false);

  /* 열릴 때 초기화 */
  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        title: event.title || '',
        description: event.description || '',
        category: event.category || 'meeting',
        all_day: !!event.all_day,
        start_at: event.all_day
          ? toDateInput(event.start_at)
          : toLocalInput(event.start_at),
        end_at: event.all_day
          ? toDateInput(event.end_at || event.start_at)
          : toLocalInput(event.end_at || event.start_at),
      });
    } else {
      /* 새 일정 — defaultDate 가 있으면 그 시간부터 1시간 */
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
        start_at: toLocalInput(start),
        end_at: toLocalInput(end),
      });
    }
  }, [open, event, defaultDate]);

  const patch = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  /* 종일 토글 시 인풋 타입 변환 */
  const toggleAllDay = (checked) => {
    setForm((prev) => {
      if (checked) {
        /* date 형태로 */
        return {
          ...prev,
          all_day: true,
          start_at: prev.start_at?.substring(0, 10) || toDateInput(new Date()),
          end_at: prev.end_at?.substring(0, 10) || toDateInput(new Date()),
        };
      }
      /* datetime-local 형태로 */
      const s = prev.start_at ? new Date(prev.start_at + 'T09:00') : new Date();
      const e = new Date(s); e.setHours(s.getHours() + 1);
      return {
        ...prev,
        all_day: false,
        start_at: toLocalInput(s),
        end_at: toLocalInput(e),
      };
    });
  };

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
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      color: cat?.color || '#4361ee',
      all_day: form.all_day,
      start_at: form.all_day ? form.start_at + 'T00:00:00' : new Date(form.start_at).toISOString(),
      end_at:   form.all_day ? form.end_at   + 'T23:59:59' : new Date(form.end_at).toISOString(),
    };

    setSaving(true);
    const res = isEdit
      ? await updateEvent(event.id, payload)
      : await createEvent(payload);
    setSaving(false);

    if (res.ok) {
      toast.success(isEdit ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.');
      closeEventModal();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async () => {
    if (!event || !window.confirm('이 일정을 삭제하시겠습니까?')) return;
    setSaving(true);
    const res = await deleteEvent(event.id);
    setSaving(false);
    if (res.ok) {
      toast.success('일정이 삭제되었습니다.');
      closeEventModal();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal isOpen={open} onClose={closeEventModal} size="sm" title={isEdit ? '일정 수정' : '새 일정'}>
      <div className="pm-form">
        <label>제목 <span className="req">*</span></label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => patch('title', e.target.value)}
          placeholder="일정 제목"
          disabled={!editable}
        />

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

        <label className="pm-check">
          <input
            type="checkbox"
            checked={form.all_day}
            onChange={(e) => editable && toggleAllDay(e.target.checked)}
            disabled={!editable}
          />
          <span>종일 일정</span>
        </label>

        <div className="pm-form-row">
          <div>
            <label>시작</label>
            <input
              type={form.all_day ? 'date' : 'datetime-local'}
              value={form.start_at}
              onChange={(e) => patch('start_at', e.target.value)}
              disabled={!editable}
            />
          </div>
          <div>
            <label>종료</label>
            <input
              type={form.all_day ? 'date' : 'datetime-local'}
              value={form.end_at}
              onChange={(e) => patch('end_at', e.target.value)}
              disabled={!editable}
            />
          </div>
        </div>

        <label>설명</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => patch('description', e.target.value)}
          placeholder="추가 메모"
          disabled={!editable}
        />

        {!editable && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 10 }}>
            <i className="fa-solid fa-lock" /> 작성자만 수정할 수 있습니다.
          </div>
        )}
      </div>

      <div className="modal-buttons">
        {isEdit && editable && (
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={handleDelete}
            disabled={saving}
          >
            삭제
          </button>
        )}
        <button type="button" className="btn btn-out" onClick={closeEventModal} disabled={saving}>
          닫기
        </button>
        &nbsp;
        {editable && (
          <button type="button" className="btn btn-in" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : isEdit ? '수정' : '추가'}
          </button>
        )}
      </div>
    </Modal>
  );
}