// components/meeting/parts/AgendaItemList.jsx
// 안건 목록 — 인라인 추가/수정/삭제. 드래그 정렬은 Phase 3 에서.

import { useState } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useProject } from '../../../contexts/ProjectContext';

export default function AgendaItemList() {
  const { user } = useAuth();
  const { current, addAgendaItem, updateAgendaItem, removeAgendaItem } = useMeetingCanvas();
  const { allUsers } = useProject();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newOwnerId, setNewOwnerId] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  if (!current) return null;
  const { canvas, agendaItems, attendees } = current;
  const isHost = canvas.host_id === user?.id;
  const canEdit = isHost || attendees.some((a) => a.user_id === user?.id);

  // 안건 담당자 후보 — 참석자 중에서 + 본인
  const ownerCandidates = attendees
    .map((a) => ({ id: a.user_id, name: a.user_name }))
    .filter((x) => x.id);

  const handleAdd = async () => {
    if (!newTopic.trim()) {
      toast.warning('안건 제목을 입력해주세요');
      return;
    }
    const owner = ownerCandidates.find((o) => o.id === newOwnerId);
    const res = await addAgendaItem(canvas.id, {
      topic: newTopic,
      duration_min: newDuration ? Number(newDuration) : null,
      owner_id: owner?.id || null,
      owner_name: owner?.name || null,
    });
    if (res.ok) {
      setNewTopic('');
      setNewDuration('');
      setNewOwnerId('');
      setAdding(false);
    } else {
      toast.error(res.error);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      topic: item.topic,
      duration_min: item.duration_min || '',
      owner_id: item.owner_id || '',
    });
  };

  const saveEdit = async () => {
    if (!editForm.topic?.trim()) {
      toast.warning('안건 제목을 입력해주세요');
      return;
    }
    const owner = ownerCandidates.find((o) => o.id === editForm.owner_id);
    const res = await updateAgendaItem(editingId, {
      topic: editForm.topic.trim(),
      duration_min: editForm.duration_min ? Number(editForm.duration_min) : null,
      owner_id: owner?.id || null,
      owner_name: owner?.name || null,
    });
    if (res.ok) {
      setEditingId(null);
    } else {
      toast.error(res.error);
    }
  };

  const handleRemove = async (item) => {
    if (!confirm(`"${item.topic}" 안건을 삭제할까요?`)) return;
    const res = await removeAgendaItem(item.id);
    if (!res.ok) toast.error(res.error);
  };

  const totalDuration = agendaItems.reduce((sum, a) => sum + (a.duration_min || 0), 0);

  return (
    <section className="mc-section">
      <div className="mc-section-head">
        <h3>
          <i className="fa-solid fa-list-check" style={{ color: '#ec4899' }} />
          안건 ({agendaItems.length})
        </h3>
        <div className="mc-section-meta">
          {totalDuration > 0 && <span>예상 {totalDuration}분</span>}
          {canvas.duration_min && totalDuration > canvas.duration_min && (
            <span style={{ color: '#f72585' }}>
              · 회의 시간 초과
            </span>
          )}
        </div>
      </div>

      {agendaItems.length === 0 && !adding && (
        <div className="mc-empty-hint">
          <i className="fa-regular fa-lightbulb" />
          <p>안건을 작성해두면 회의가 훨씬 효율적이에요</p>
        </div>
      )}

      <ol className="mc-agenda-list">
        {agendaItems.map((item, idx) => (
          <li key={item.id} className="mc-agenda-item">
            {editingId === item.id ? (
              <div className="mc-agenda-edit">
                <input
                  type="text"
                  className="mc-input"
                  value={editForm.topic}
                  onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                  placeholder="안건 제목"
                  autoFocus
                />
                <div className="mc-agenda-edit-row">
                  <select
                    className="mc-input"
                    value={editForm.owner_id}
                    onChange={(e) => setEditForm({ ...editForm, owner_id: e.target.value })}
                  >
                    <option value="">담당자 선택 (선택)</option>
                    {ownerCandidates.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="mc-input"
                    placeholder="예상 분"
                    min={1}
                    value={editForm.duration_min}
                    onChange={(e) => setEditForm({ ...editForm, duration_min: e.target.value })}
                    style={{ width: 110 }}
                  />
                  <button type="button" className="mc-btn-sm primary" onClick={saveEdit}>저장</button>
                  <button type="button" className="mc-btn-sm" onClick={() => setEditingId(null)}>취소</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mc-agenda-main">
                  <span className="mc-agenda-num">{idx + 1}.</span>
                  <span className="mc-agenda-topic">{item.topic}</span>
                  {item.owner_name && (
                    <span className="mc-agenda-owner">
                      <i className="fa-solid fa-user" /> {item.owner_name}
                    </span>
                  )}
                  {item.duration_min && (
                    <span className="mc-agenda-duration">
                      <i className="fa-regular fa-clock" /> {item.duration_min}분
                    </span>
                  )}
                </div>
                {canEdit && (
                  <div className="mc-agenda-tools">
                    <button
                      type="button"
                      className="mc-icon-btn"
                      onClick={() => startEdit(item)}
                      title="수정"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      type="button"
                      className="mc-icon-btn mc-icon-danger"
                      onClick={() => handleRemove(item)}
                      title="삭제"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ol>

      {/* 인라인 추가 폼 */}
      {adding ? (
        <div className="mc-agenda-add-form">
          <input
            type="text"
            className="mc-input"
            placeholder="안건 제목 입력 (예: Q2 OKR 검토)"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setAdding(false);
            }}
            autoFocus
          />
          <div className="mc-agenda-edit-row">
            <select
              className="mc-input"
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
            >
              <option value="">담당자 (선택)</option>
              {ownerCandidates.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <input
              type="number"
              className="mc-input"
              placeholder="예상 분"
              min={1}
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              style={{ width: 110 }}
            />
            <button type="button" className="mc-btn-sm primary" onClick={handleAdd}>
              추가
            </button>
            <button type="button" className="mc-btn-sm" onClick={() => {
              setAdding(false); setNewTopic(''); setNewDuration(''); setNewOwnerId('');
            }}>취소</button>
          </div>
        </div>
      ) : canEdit ? (
        <button type="button" className="mc-add-btn" onClick={() => setAdding(true)}>
          <i className="fa-solid fa-plus" /> 안건 추가
        </button>
      ) : null}
    </section>
  );
}