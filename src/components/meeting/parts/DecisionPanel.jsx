// components/meeting/parts/DecisionPanel.jsx
// Live 우측 패널 — 결정/액션/질문/메모 빠른 추가 + 목록.

import { useState, useEffect, useRef } from 'react';
import { useMeetingCanvas } from '../../../contexts/MeetingCanvasContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DECISION_TYPES, getDecisionTypeMeta } from '../../../config/meetingCanvasConfig';
import DecisionCard from './DecisionCard';

export default function DecisionPanel() {
  const { user } = useAuth();
  const { current, addDecision } = useMeetingCanvas();
  const toast = useToast();

  const [filter, setFilter] = useState('all');     // all | decision | action | question | note
  const [addingType, setAddingType] = useState(null); // null = 닫힘, 'decision' 등 = 그 타입으로 추가 중
  const [content, setContent] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  /* 키보드 단축키 — Cmd+D 결정, Cmd+A 액션 */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          openAdd('decision');
        } else if (e.key === 'g' || e.key === 'G') {
          /* Cmd+G — 액션 (Cmd+A 는 브라우저 전체선택과 충돌해서 변경) */
          e.preventDefault();
          openAdd('action');
        }
      }
      if (e.key === 'Escape' && addingType) {
        closeAdd();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addingType]);

  if (!current) return null;
  const { canvas, attendees, decisions } = current;
  const isHost = canvas.host_id === user?.id;
  const canEdit = isHost || attendees.some((a) => a.user_id === user?.id);

  const ownerCandidates = attendees
    .map((a) => ({ id: a.user_id, name: a.user_name }))
    .filter((x) => x.id);

  const openAdd = (type) => {
    setAddingType(type);
    setContent('');
    setOwnerId('');
    setDueDate('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeAdd = () => {
    setAddingType(null);
    setContent('');
    setOwnerId('');
    setDueDate('');
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.warning('내용을 입력해주세요');
      return;
    }
    const owner = ownerCandidates.find((o) => o.id === ownerId);
    setSubmitting(true);
    const res = await addDecision(canvas.id, {
      type: addingType,
      content: content.trim(),
      owner_id: owner?.id || null,
      owner_name: owner?.name || null,
      due_date: dueDate || null,
    });
    setSubmitting(false);
    if (res.ok) {
      const meta = getDecisionTypeMeta(addingType);
      toast.success(`${meta.label} 추가됨`);
      closeAdd();
    } else {
      toast.error(res.error);
    }
  };

  const visibleDecisions = decisions.filter((d) => filter === 'all' || d.type === filter);

  /* 타입별 카운트 */
  const counts = decisions.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <aside className="mc-decision-panel">
      <div className="mc-decision-panel-head">
        <h3>
          <i className="fa-solid fa-bolt" />
          결정 / 액션
        </h3>
      </div>

      {/* 빠른 추가 버튼들 */}
      {canEdit && !addingType && (
        <div className="mc-decision-quick-add">
          {DECISION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className="mc-decision-add-btn"
              onClick={() => openAdd(t.value)}
              style={{ borderColor: `${t.color}55`, color: t.color }}
              title={
                t.value === 'decision' ? '결정 추가 (Cmd+D)' :
                t.value === 'action' ? '액션 추가 (Cmd+G)' :
                `${t.label} 추가`
              }
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 인라인 추가 폼 */}
      {addingType && (() => {
        const meta = getDecisionTypeMeta(addingType);
        const isAction = addingType === 'action';
        return (
          <div
            className="mc-decision-add-form"
            style={{ borderLeftColor: meta.color }}
          >
            <div className="mc-decision-add-form-head" style={{ color: meta.color }}>
              <i className={`fa-solid ${meta.icon}`} /> {meta.label} 추가
            </div>
            <textarea
              ref={inputRef}
              className="mc-input"
              rows={2}
              placeholder={meta.placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            {isAction && (
              <div className="mc-decision-add-row">
                <select
                  className="mc-input"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  <option value="">담당자</option>
                  {ownerCandidates.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="mc-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            )}
            <div className="mc-decision-add-buttons">
              <button
                type="button"
                className="mc-btn-sm primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '추가 중...' : '추가 (Cmd+Enter)'}
              </button>
              <button type="button" className="mc-btn-sm" onClick={closeAdd}>취소</button>
            </div>
          </div>
        );
      })()}

      {/* 필터 칩 */}
      {decisions.length > 0 && (
        <div className="mc-decision-filter">
          <button
            type="button"
            className={`mc-decision-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({decisions.length})
          </button>
          {DECISION_TYPES.map((t) => {
            const c = counts[t.value] || 0;
            if (c === 0) return null;
            return (
              <button
                key={t.value}
                type="button"
                className={`mc-decision-chip ${filter === t.value ? 'active' : ''}`}
                onClick={() => setFilter(t.value)}
                style={filter === t.value ? { color: t.color, borderColor: t.color } : {}}
              >
                <i className={`fa-solid ${t.icon}`} /> {c}
              </button>
            );
          })}
        </div>
      )}

      {/* 목록 */}
      <div className="mc-decision-list">
        {visibleDecisions.length === 0 ? (
          <div className="mc-empty-hint">
            <i className="fa-regular fa-clipboard" />
            <p>
              {filter === 'all'
                ? '아직 기록된 항목이 없어요'
                : '이 카테고리는 비어있어요'}
            </p>
            {filter === 'all' && canEdit && (
              <small>회의 중 나오는 결정과 액션을 바로 기록하세요</small>
            )}
          </div>
        ) : (
          visibleDecisions.map((d) => <DecisionCard key={d.id} decision={d} />)
        )}
      </div>
    </aside>
  );
}