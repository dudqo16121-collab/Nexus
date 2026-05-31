// components/admin/AdminMissionsTab.jsx
// 시스템 관리 — 도전 과제 (자동 미션) 탭.

import { useState, useEffect } from 'react';
import { useHub } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

/* 활동 타입 메타데이터 — 표시용 */
const ACTIVITY_TYPES = [
  { value: 'kudos_sent',         label: '칭찬 보내기',       icon: 'fa-heart',              color: '#f72585' },
  { value: 'ask_resolved',       label: '도움 요청 해결',    icon: 'fa-hand-holding-hand',  color: '#f59e0b' },
  { value: 'task_done',          label: '태스크 완료',       icon: 'fa-circle-check',       color: '#4361ee' },
  { value: 'idea_created',       label: '아이디어 카드',     icon: 'fa-lightbulb',          color: '#06d6a0' },
  { value: 'approval_processed', label: '결재 처리',         icon: 'fa-stamp',              color: '#8338ec' },
  { value: 'cowork_session',     label: '공동 작업 세션',    icon: 'fa-handshake-angle',    color: '#06d6a0' },
  { value: 'standup_written',    label: '스탠드업 작성',     icon: 'fa-mug-saucer',         color: '#f59e0b' },
  { value: 'wiki_promoted',      label: '위키 승격',         icon: 'fa-book',               color: '#4361ee' },
];

/* 미션에 쓸 수 있는 아이콘들 */
const ICONS = [
  'fa-bullseye', 'fa-trophy', 'fa-rocket', 'fa-fire', 'fa-bolt',
  'fa-heart', 'fa-star', 'fa-hand-holding-hand', 'fa-circle-check',
  'fa-lightbulb', 'fa-stamp', 'fa-handshake-angle', 'fa-mug-saucer',
  'fa-book', 'fa-medal', 'fa-crown', 'fa-gem', 'fa-flag',
];

/* 색상 팔레트 */
const COLORS = [
  '#4361ee', '#8338ec', '#06d6a0', '#f59e0b', '#ef4444',
  '#f72585', '#ec4899', '#64748b', '#0ea5e9', '#22c55e',
];

const EMPTY_FORM = {
  code: '',
  title: '',
  description: '',
  icon: 'fa-bullseye',
  color: '#4361ee',
  activity_type: 'kudos_sent',
  target_count: 3,
  points: 30,
  period: 'weekly',
  status: 'active',
};

export default function AdminMissionsTab() {
  const toast = useToast();
  const {
    autoMissions,
    fetchAutoMissions,
    createAutoMission,
    updateAutoMission,
    deleteAutoMission,
    autoClaims,
  } = useHub();

  const [editingId, setEditingId] = useState(null); // null | 'new' | uuid
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAutoMissions();
  }, [fetchAutoMissions]);

  const startEdit = (mission) => {
    setEditingId(mission.id);
    setForm({
      code: mission.code,
      title: mission.title,
      description: mission.description || '',
      icon: mission.icon || 'fa-bullseye',
      color: mission.color || '#4361ee',
      activity_type: mission.activity_type,
      target_count: mission.target_count,
      points: mission.points,
      period: mission.period || 'weekly',
      status: mission.status,
    });
  };

  const startNew = () => {
    setEditingId('new');
    setForm(EMPTY_FORM);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const patchForm = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }
    if (!form.code.trim()) {
      toast.warning('코드(고유 식별자)를 입력해주세요.');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      target_count: parseInt(form.target_count, 10) || 1,
      points: parseInt(form.points, 10) || 10,
    };

    let res;
    if (editingId === 'new') {
      res = await createAutoMission(payload);
    } else {
      res = await updateAutoMission(editingId, payload);
    }
    setSaving(false);

    if (res.ok) {
      toast.success(editingId === 'new' ? '도전 과제를 추가했어요.' : '수정했어요.');
      cancelEdit();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (mission) => {
    if (mission.is_seed) {
      toast.warning('기본 도전 과제는 삭제할 수 없어요. 비활성화는 가능합니다.');
      return;
    }
    if (!window.confirm(`"${mission.title}"을(를) 삭제할까요?\n\n달성 기록은 보존되지만 더 이상 진행률이 카운트되지 않아요.`)) return;
    const res = await deleteAutoMission(mission.id);
    if (res.ok) toast.success('삭제했어요.');
    else toast.error(res.error);
  };

  const handleToggleStatus = async (mission) => {
    const newStatus = mission.status === 'active' ? 'paused' : 'active';
    const res = await updateAutoMission(mission.id, { status: newStatus });
    if (res.ok) toast.success(newStatus === 'active' ? '활성화했어요.' : '일시중지했어요.');
    else toast.error(res.error);
  };

  /* 통계 — 이번 주 클레임 수, 총 지급 포인트 */
  const stats = autoMissions.map((m) => {
    const claims = autoClaims.filter((c) => c.auto_mission_id === m.id);
    const totalPoints = claims.reduce((sum, c) => sum + (c.points_earned || 0), 0);
    return { id: m.id, totalClaims: claims.length, totalPoints };
  });
  const getStats = (id) => stats.find((s) => s.id === id) || { totalClaims: 0, totalPoints: 0 };

  /* 활동 타입 메타 찾기 */
  const findActivity = (type) => ACTIVITY_TYPES.find((a) => a.value === type);

  return (
    <div className="admin-missions-tab">
      {/* 헤더 */}
      <div className="admin-missions-header">
        <div>
          <h3>도전 과제 관리</h3>
          <p>INJOY Hub에 표시되는 주간 도전 과제를 관리해요. 매주 월요일에 자동으로 리셋됩니다.</p>
        </div>
        <button
          type="button"
          className="admin-missions-add-btn"
          onClick={startNew}
          disabled={editingId === 'new'}
        >
          <i className="fa-solid fa-plus" /> 새 도전 과제
        </button>
      </div>

      {/* 새로 만들기 폼 */}
      {editingId === 'new' && (
        <MissionForm
          form={form}
          patchForm={patchForm}
          onSave={handleSave}
          onCancel={cancelEdit}
          saving={saving}
          isNew
        />
      )}

      {/* 미션 리스트 */}
      <div className="admin-missions-list">
        {autoMissions.length === 0 ? (
          <div className="admin-missions-empty">
            <i className="fa-solid fa-bullseye" />
            <p>아직 도전 과제가 없어요.</p>
            <button type="button" onClick={startNew} className="admin-missions-empty-btn">
              첫 도전 과제 만들기
            </button>
          </div>
        ) : (
          autoMissions.map((mission) => {
            const isEditing = editingId === mission.id;
            const act = findActivity(mission.activity_type);
            const s = getStats(mission.id);

            if (isEditing) {
              return (
                <MissionForm
                  key={mission.id}
                  form={form}
                  patchForm={patchForm}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              );
            }

            return (
              <div
                key={mission.id}
                className={`admin-mission-row ${mission.status === 'paused' ? 'paused' : ''}`}
              >
                <div
                  className="admin-mission-icon"
                  style={{ background: `${mission.color}15`, color: mission.color }}
                >
                  <i className={`fa-solid ${mission.icon}`} />
                </div>

                <div className="admin-mission-info">
                  <div className="admin-mission-title-row">
                    <strong>{mission.title}</strong>
                    {mission.is_seed && (
                      <span className="admin-mission-seed-badge" title="기본 시드 미션 (삭제 불가)">
                        <i className="fa-solid fa-seedling" /> 기본
                      </span>
                    )}
                    {mission.status === 'paused' && (
                      <span className="admin-mission-paused-badge">
                        <i className="fa-solid fa-pause" /> 일시중지
                      </span>
                    )}
                  </div>
                  {mission.description && (
                    <p className="admin-mission-desc">{mission.description}</p>
                  )}
                  <div className="admin-mission-meta">
                    {act && (
                      <span className="admin-mission-activity" style={{ color: act.color }}>
                        <i className={`fa-solid ${act.icon}`} /> {act.label}
                      </span>
                    )}
                    <span>
                      <i className="fa-solid fa-bullseye" /> 목표 {mission.target_count}회
                    </span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                      <i className="fa-solid fa-coins" /> {mission.points}P
                    </span>
                    <span className="admin-mission-stats" title="누적 통계">
                      <i className="fa-solid fa-chart-line" /> {s.totalClaims}회 달성 · {s.totalPoints}P 지급
                    </span>
                  </div>
                </div>

                <div className="admin-mission-actions">
                  <button
                    type="button"
                    className="admin-mission-action-btn"
                    onClick={() => handleToggleStatus(mission)}
                    title={mission.status === 'active' ? '일시중지' : '활성화'}
                  >
                    <i className={`fa-solid ${mission.status === 'active' ? 'fa-pause' : 'fa-play'}`} />
                  </button>
                  <button
                    type="button"
                    className="admin-mission-action-btn"
                    onClick={() => startEdit(mission)}
                    title="수정"
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                  {!mission.is_seed && (
                    <button
                      type="button"
                      className="admin-mission-action-btn danger"
                      onClick={() => handleDelete(mission)}
                      title="삭제"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   미션 작성/수정 폼 — 인라인 에디터
   ───────────────────────────────────────────── */
function MissionForm({ form, patchForm, onSave, onCancel, saving, isNew = false }) {
  return (
    <div className="admin-mission-form">
      <div className="admin-mission-form-head">
        <h4>
          <i className={`fa-solid ${isNew ? 'fa-plus' : 'fa-pen'}`} />
          {isNew ? '새 도전 과제' : '도전 과제 수정'}
        </h4>
      </div>

      <div className="admin-mission-form-grid">
        {/* 제목 */}
        <div className="admin-mission-form-field full">
          <label>제목 <span className="req">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => patchForm('title', e.target.value)}
            placeholder="예: 이번 주 칭찬 보내기"
            maxLength={50}
          />
        </div>

        {/* 코드 — 시스템 식별자 */}
        <div className="admin-mission-form-field full">
          <label>
            코드 <span className="req">*</span>
            <span className="hint">영문 소문자, 숫자, 밑줄만 — 한번 정하면 변경 비추천</span>
          </label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => patchForm('code', e.target.value.replace(/[^a-z0-9_]/g, ''))}
            placeholder="weekly_kudos_send"
            maxLength={50}
          />
        </div>

        {/* 설명 */}
        <div className="admin-mission-form-field full">
          <label>설명</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => patchForm('description', e.target.value)}
            placeholder="동료에게 칭찬 메시지를 보내요"
            maxLength={200}
          />
        </div>

        {/* 활동 타입 */}
        <div className="admin-mission-form-field full">
          <label>
            추적할 활동 타입 <span className="req">*</span>
            <span className="hint">이 활동을 할 때마다 진행률이 자동으로 올라가요</span>
          </label>
          <div className="admin-mission-activity-grid">
            {ACTIVITY_TYPES.map((a) => (
              <button
                key={a.value}
                type="button"
                className={`admin-mission-activity-btn ${form.activity_type === a.value ? 'active' : ''}`}
                style={
                  form.activity_type === a.value
                    ? { background: a.color, borderColor: a.color, color: '#fff' }
                    : { color: a.color, borderColor: `${a.color}50` }
                }
                onClick={() => patchForm('activity_type', a.value)}
              >
                <i className={`fa-solid ${a.icon}`} />
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* 목표 횟수 */}
        <div className="admin-mission-form-field">
          <label>목표 횟수 <span className="req">*</span></label>
          <input
            type="number"
            min="1"
            value={form.target_count}
            onChange={(e) => patchForm('target_count', e.target.value)}
          />
        </div>

        {/* 보상 포인트 */}
        <div className="admin-mission-form-field">
          <label>보상 포인트 <span className="req">*</span></label>
          <input
            type="number"
            min="0"
            value={form.points}
            onChange={(e) => patchForm('points', e.target.value)}
          />
        </div>

        {/* 주기 */}
        <div className="admin-mission-form-field">
          <label>주기</label>
          <select value={form.period} onChange={(e) => patchForm('period', e.target.value)}>
            <option value="weekly">주간 (매주 월요일 리셋)</option>
            <option value="daily">일일 (매일 리셋)</option>
          </select>
        </div>

        {/* 상태 */}
        <div className="admin-mission-form-field">
          <label>상태</label>
          <select value={form.status} onChange={(e) => patchForm('status', e.target.value)}>
            <option value="active">활성</option>
            <option value="paused">일시중지</option>
          </select>
        </div>

        {/* 아이콘 선택 */}
        <div className="admin-mission-form-field full">
          <label>아이콘</label>
          <div className="admin-mission-icon-grid">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`admin-mission-icon-btn ${form.icon === ic ? 'active' : ''}`}
                onClick={() => patchForm('icon', ic)}
                style={
                  form.icon === ic
                    ? { background: form.color, borderColor: form.color, color: '#fff' }
                    : undefined
                }
              >
                <i className={`fa-solid ${ic}`} />
              </button>
            ))}
          </div>
        </div>

        {/* 색상 선택 */}
        <div className="admin-mission-form-field full">
          <label>색상</label>
          <div className="admin-mission-color-grid">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`admin-mission-color-btn ${form.color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => patchForm('color', c)}
              >
                {form.color === c && <i className="fa-solid fa-check" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 미리보기 */}
      <div className="admin-mission-preview">
        <div className="admin-mission-preview-label">미리보기</div>
        <div className="admin-mission-preview-card">
          <div
            className="admin-mission-icon"
            style={{ background: `${form.color}15`, color: form.color }}
          >
            <i className={`fa-solid ${form.icon}`} />
          </div>
          <div className="admin-mission-info">
            <strong>{form.title || '도전 과제 제목'}</strong>
            {form.description && <p className="admin-mission-desc">{form.description}</p>}
            <div className="admin-mission-meta">
              <span>목표 {form.target_count}회</span>
              <span style={{ color: '#f59e0b' }}>+{form.points}P</span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-mission-form-actions">
        <button type="button" className="btn btn-out" onClick={onCancel} disabled={saving}>
          취소
        </button>
        <button type="button" className="btn btn-in" onClick={onSave} disabled={saving}>
          {saving ? '저장 중...' : isNew ? '추가' : '저장'}
        </button>
      </div>
    </div>
  );
}