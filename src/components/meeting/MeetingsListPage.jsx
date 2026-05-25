// components/meeting/MeetingsListPage.jsx
// 내 회의 목록 + 새 회의 생성.

import { useState } from 'react';
import { useMeetingCanvas } from '../../contexts/MeetingCanvasContext';
import { useToast } from '../../contexts/ToastContext';
import { getPhaseMeta } from '../../config/meetingCanvasConfig';
import Modal from '../common/Modal';

function fmtRelative(iso) {
  if (!iso) return '시간 미정';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.round(diff / 86400_000);
    if (Math.abs(days) < 1) {
      return d.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ' 오늘';
    }
    if (days === 1) return '내일';
    if (days === -1) return '어제';
    if (days > 1 && days < 7) return `${days}일 후`;
    if (days < -1 && days > -7) return `${-days}일 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function MeetingsListPage({ onSelect }) {
  const {
    myMeetings, meetingsLoading, meetingsByPhase,
    fetchCanvas, createCanvas,
  } = useMeetingCanvas();
  const toast = useToast();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  /* 새 회의 폼 */
  const [form, setForm] = useState({
    title: '',
    scheduled_at: '',
    duration_min: 30,
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const visible = myMeetings
    .filter((m) => filter === 'all' || m.phase === filter)
    .filter((m) =>
      !search.trim() ||
      (m.title || '').toLowerCase().includes(search.toLowerCase())
    );

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.warning('회의 제목을 입력해주세요');
      return;
    }
    setSubmitting(true);
    const res = await createCanvas({
      title: form.title.trim(),
      scheduled_at: form.scheduled_at
        ? new Date(form.scheduled_at).toISOString()
        : null,
      duration_min: Number(form.duration_min) || 30,
      location: form.location.trim() || null,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success('회의 캔버스 생성됨');
      setCreateOpen(false);
      setForm({ title: '', scheduled_at: '', duration_min: 30, location: '' });
      fetchCanvas(res.canvas.id);
      onSelect?.(res.canvas.id);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="mc-list-page">
      <header className="mc-list-head">
        <div>
          <h2>
            <i className="fa-solid fa-microphone" style={{ color: '#ec4899' }} />
            회의 캔버스
          </h2>
          <p className="mc-list-tagline">
            회의 전·중·후를 한 곳에서 — 안건, 메모, 결정사항이 모두 살아있는 문서로
          </p>
        </div>
        <button type="button" className="mc-btn-primary" onClick={() => setCreateOpen(true)}>
          <i className="fa-solid fa-plus" /> 새 회의
        </button>
      </header>

      <div className="mc-list-filter">
        <input
          type="text"
          className="mc-input"
          placeholder="🔍 회의 제목 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div className="mc-list-chips">
          <button
            type="button"
            className={`mc-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({myMeetings.length})
          </button>
          {['pre', 'live', 'post', 'archived'].map((p) => {
            const meta = getPhaseMeta(p);
            const count = meetingsByPhase[p]?.length || 0;
            return (
              <button
                key={p}
                type="button"
                className={`mc-chip ${filter === p ? 'active' : ''}`}
                onClick={() => setFilter(p)}
                style={filter === p ? { borderColor: meta.color, color: meta.color } : {}}
              >
                <i className={`fa-solid ${meta.icon}`} /> {meta.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {meetingsLoading ? (
        <div className="mc-list-empty">
          <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
        </div>
      ) : visible.length === 0 ? (
        <div className="mc-list-empty">
          <i className="fa-regular fa-calendar" />
          <p>{search ? '검색 결과가 없어요' : '아직 회의가 없어요. 첫 회의를 만들어보세요.'}</p>
        </div>
      ) : (
        <div className="mc-list-grid">
          {visible.map((m) => {
            const meta = getPhaseMeta(m.phase);
            return (
              <article
                key={m.id}
                className="mc-list-card"
                onClick={() => {
                  fetchCanvas(m.id);
                  onSelect?.(m.id);
                }}
              >
                <div className="mc-list-card-head">
                  <span
                    className="mc-phase-badge"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                  >
                    <i className={`fa-solid ${meta.icon}`} /> {meta.label}
                  </span>
                  <span className="mc-list-card-when">
                    {fmtRelative(m.scheduled_at || m.created_at)}
                  </span>
                </div>
                <h4 className="mc-list-card-title">{m.title}</h4>
                <div className="mc-list-card-meta">
                  <span><i className="fa-solid fa-user-tie" /> {m.host_name}</span>
                  {m.location && (
                    <span><i className="fa-solid fa-location-dot" /> {m.location}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 새 회의 생성 모달 */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        size="md"
        title={
          <>
            <i className="fa-solid fa-plus-circle" style={{ color: '#ec4899' }} />
            새 회의 캔버스
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">회의 제목 *</label>
          <input
            type="text"
            className="form-input"
            placeholder="예: Q2 OKR 리뷰 미팅"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
            maxLength={300}
          />
        </div>
        <div className="form-group">
          <label className="form-label">일시</label>
          <input
            type="datetime-local"
            className="form-input"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">예상 시간 (분)</label>
            <input
              type="number"
              className="form-input"
              min={5}
              max={480}
              value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">장소 (선택)</label>
            <input
              type="text"
              className="form-input"
              placeholder="예: 회의실 A / 온라인"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-out" onClick={() => setCreateOpen(false)}>
            취소
          </button>
          <button
            type="button"
            className="btn btn-in"
            onClick={handleCreate}
            disabled={submitting}
            style={{ background: '#ec4899' }}
          >
            {submitting ? '생성 중...' : '회의 만들기'}
          </button>
        </div>
      </Modal>
    </div>
  );
}