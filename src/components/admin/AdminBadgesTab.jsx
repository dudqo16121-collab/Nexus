// components/admin/AdminBadgesTab.jsx
// 시스템 관리 — 뱃지 관리 탭.

import { useState, useEffect } from 'react';
import { useHub, BADGE_RARITY } from '../../contexts/HubContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

/* 조건 타입 — 8개 명시적 선택 */
const CONDITION_TYPES = [
  { value: 'kudos_received',  label: '받은 칭찬 수',     icon: 'fa-heart',                color: '#f72585',  unit: '개' },
  { value: 'kudos_sent',      label: '보낸 칭찬 수',     icon: 'fa-paper-plane',          color: '#06d6a0',  unit: '개' },
  { value: 'checkin_streak',  label: '연속 출석 일수',   icon: 'fa-fire',                 color: '#f59e0b',  unit: '일' },
  { value: 'total_checkins',  label: '누적 체크인 수',   icon: 'fa-calendar-check',       color: '#4361ee',  unit: '회' },
  { value: 'mission_cleared', label: '미션 달성 수',     icon: 'fa-bullseye',             color: '#8338ec',  unit: '개' },
  { value: 'ask_resolved',    label: '도움 요청 해결',   icon: 'fa-hand-holding-hand',    color: '#f59e0b',  unit: '건' },
  { value: 'tasks_done',      label: '태스크 완료 수',   icon: 'fa-circle-check',         color: '#4361ee',  unit: '개' },
];

/* 카테고리 */
const CATEGORIES = [
  { value: 'kudos',      label: '칭찬' },
  { value: 'attendance', label: '출석' },
  { value: 'activity',   label: '활동' },
  { value: 'special',    label: '특별' },
  { value: 'general',    label: '일반' },
];

/* 희귀도별 기본 보너스 포인트 */
const RARITY_DEFAULT_POINTS = {
  common: 20,
  rare: 50,
  epic: 100,
  legendary: 200,
};

/* 아이콘 선택지 */
const ICONS = [
  'fa-medal', 'fa-trophy', 'fa-crown', 'fa-star',
  'fa-heart', 'fa-fire', 'fa-bolt', 'fa-rocket',
  'fa-paper-plane', 'fa-hand-holding-heart', 'fa-people-group', 'fa-hand-holding-hand',
  'fa-bullseye', 'fa-shield-halved', 'fa-flag', 'fa-gem',
  'fa-award', 'fa-ribbon', 'fa-calendar-check', 'fa-mug-saucer',
  'fa-lightbulb', 'fa-hands-praying', 'fa-circle-check', 'fa-stamp',
];

/* 색상 팔레트 */
const COLORS = [
  '#f72585', '#f59e0b', '#ef4444', '#fbbf24',
  '#06d6a0', '#22c55e', '#10b981', '#06b6d4',
  '#4361ee', '#3b82f6', '#8338ec', '#a855f7',
  '#ec4899', '#64748b', '#0ea5e9', '#84cc16',
];

const EMPTY_FORM = {
  code: '',
  title: '',
  description: '',
  icon: 'fa-medal',
  color: '#f59e0b',
  rarity: 'common',
  bonus_points: 20,
  category: 'general',
  condition_type: 'kudos_received',
  condition_value: 10,
  sort_order: 0,
  is_active: true,
};

export default function AdminBadgesTab() {
  const toast = useToast();
  const { badges, userBadges, fetchBadges } = useHub();

  const [editingId, setEditingId] = useState(null); // null | 'new' | uuid
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [allBadges, setAllBadges] = useState([]); // 비활성 포함 전체

  /* 전체 뱃지 (비활성 포함) 로드 */
  const fetchAllBadges = async () => {
    const { data, error } = await supabase
      .from('hub_badges')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error) setAllBadges(data || []);
  };

  useEffect(() => {
    fetchAllBadges();
  }, []);

  const refreshAll = async () => {
    await Promise.all([fetchAllBadges(), fetchBadges()]);
  };

  const startEdit = (badge) => {
    setEditingId(badge.id);
    setForm({
      code: badge.code,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      color: badge.color,
      rarity: badge.rarity,
      bonus_points: badge.bonus_points,
      category: badge.category,
      condition_type: badge.condition_type,
      condition_value: badge.condition_value,
      sort_order: badge.sort_order || 0,
      is_active: badge.is_active !== false,
    });
  };

  const startNew = () => {
    setEditingId('new');
    setForm({
      ...EMPTY_FORM,
      sort_order: (allBadges.length + 1) * 10,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const patchForm = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  /* 희귀도 변경 시 기본 포인트 자동 추천 */
  const handleRarityChange = (rarity) => {
    setForm((p) => ({
      ...p,
      rarity,
      bonus_points: RARITY_DEFAULT_POINTS[rarity] || p.bonus_points,
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }
    if (!form.code.trim()) {
      toast.warning('코드(고유 식별자)를 입력해주세요.');
      return;
    }
    if (!form.description.trim()) {
      toast.warning('설명을 입력해주세요.');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      bonus_points: parseInt(form.bonus_points, 10) || 0,
      condition_value: parseInt(form.condition_value, 10) || 1,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };

    try {
      if (editingId === 'new') {
        const { error } = await supabase
          .from('hub_badges')
          .insert([payload]);
        if (error) throw error;
        toast.success('새 뱃지를 추가했어요.');
      } else {
        const { error } = await supabase
          .from('hub_badges')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('뱃지를 수정했어요.');
      }
      await refreshAll();
      cancelEdit();
    } catch (e) {
      if (e.code === '23505') {
        toast.error('이미 사용 중인 코드예요.');
      } else {
        toast.error(e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (badge) => {
    const earnedCount = userBadges.filter((ub) => ub.badge_id === badge.id).length;
    const msg = earnedCount > 0
      ? `"${badge.title}"을(를) 삭제할까요?\n\n현재 ${earnedCount}명이 보유 중인 뱃지입니다.\n보유 기록도 함께 삭제돼요.`
      : `"${badge.title}"을(를) 삭제할까요?`;

    if (!window.confirm(msg)) return;

    try {
      const { error } = await supabase.from('hub_badges').delete().eq('id', badge.id);
      if (error) throw error;
      toast.success('삭제했어요.');
      await refreshAll();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleToggleActive = async (badge) => {
    try {
      const { error } = await supabase
        .from('hub_badges')
        .update({ is_active: !badge.is_active })
        .eq('id', badge.id);
      if (error) throw error;
      toast.success(badge.is_active ? '비활성화했어요.' : '활성화했어요.');
      await refreshAll();
    } catch (e) {
      toast.error(e.message);
    }
  };

  /* 보유자 카운트 */
  const getEarnedCount = (badgeId) =>
    userBadges.filter((ub) => ub.badge_id === badgeId).length;

  /* 조건 타입 메타 */
  const findCondition = (type) => CONDITION_TYPES.find((c) => c.value === type);

  return (
    <div className="admin-badges-tab">
      <div className="admin-badges-header">
        <div>
          <h3>뱃지 관리</h3>
          <p>INJOY Hub에 표시되는 뱃지를 관리해요. 조건 달성 시 자동으로 사용자에게 부여됩니다.</p>
        </div>
        <button
          type="button"
          className="admin-badges-add-btn"
          onClick={startNew}
          disabled={editingId === 'new'}
        >
          <i className="fa-solid fa-plus" /> 새 뱃지
        </button>
      </div>

      {/* 새로 만들기 폼 */}
      {editingId === 'new' && (
        <BadgeForm
          form={form}
          patchForm={patchForm}
          onRarityChange={handleRarityChange}
          onSave={handleSave}
          onCancel={cancelEdit}
          saving={saving}
          isNew
        />
      )}

      {/* 뱃지 리스트 */}
      <div className="admin-badges-list">
        {allBadges.length === 0 ? (
          <div className="admin-badges-empty">
            <i className="fa-solid fa-medal" />
            <p>아직 뱃지가 없어요.</p>
            <button type="button" onClick={startNew} className="admin-badges-empty-btn">
              첫 뱃지 만들기
            </button>
          </div>
        ) : (
          allBadges.map((badge) => {
            const isEditing = editingId === badge.id;
            const rarity = BADGE_RARITY[badge.rarity] || BADGE_RARITY.common;
            const condition = findCondition(badge.condition_type);
            const earnedCount = getEarnedCount(badge.id);

            if (isEditing) {
              return (
                <BadgeForm
                  key={badge.id}
                  form={form}
                  patchForm={patchForm}
                  onRarityChange={handleRarityChange}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              );
            }

            return (
              <div
                key={badge.id}
                className={`admin-badge-row ${!badge.is_active ? 'paused' : ''}`}
              >
                <div
                  className="admin-badge-icon"
                  style={{
                    background: badge.is_active
                      ? `linear-gradient(135deg, ${badge.color}, ${badge.color}cc)`
                      : 'var(--bg-2)',
                    color: badge.is_active ? '#fff' : 'var(--text-muted)',
                    boxShadow: badge.is_active ? `0 4px 14px ${rarity.glow}` : 'none',
                  }}
                >
                  <i className={`fa-solid ${badge.icon}`} />
                </div>

                <div className="admin-badge-info">
                  <div className="admin-badge-title-row">
                    <strong>{badge.title}</strong>
                    <span
                      className="admin-badge-rarity-tag"
                      style={{ background: rarity.color }}
                    >
                      {rarity.label}
                    </span>
                    {!badge.is_active && (
                      <span className="admin-badge-paused-badge">
                        <i className="fa-solid fa-eye-slash" /> 비활성
                      </span>
                    )}
                  </div>
                  <p className="admin-badge-desc">{badge.description}</p>
                  <div className="admin-badge-meta">
                    {condition && (
                      <span className="admin-badge-condition" style={{ color: condition.color }}>
                        <i className={`fa-solid ${condition.icon}`} />
                        {condition.label} <strong>{badge.condition_value}{condition.unit}</strong>
                      </span>
                    )}
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                      <i className="fa-solid fa-coins" /> +{badge.bonus_points}P
                    </span>
                    <span className="admin-badge-earned-count" title="보유자 수">
                      <i className="fa-solid fa-users" /> {earnedCount}명 보유
                    </span>
                  </div>
                </div>

                <div className="admin-badge-actions">
                  <button
                    type="button"
                    className="admin-badge-action-btn"
                    onClick={() => handleToggleActive(badge)}
                    title={badge.is_active ? '비활성화' : '활성화'}
                  >
                    <i className={`fa-solid ${badge.is_active ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                  <button
                    type="button"
                    className="admin-badge-action-btn"
                    onClick={() => startEdit(badge)}
                    title="수정"
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button
                    type="button"
                    className="admin-badge-action-btn danger"
                    onClick={() => handleDelete(badge)}
                    title="삭제"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
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
   뱃지 작성/수정 폼
   ───────────────────────────────────────────── */
function BadgeForm({ form, patchForm, onRarityChange, onSave, onCancel, saving, isNew = false }) {
  const rarity = BADGE_RARITY[form.rarity] || BADGE_RARITY.common;

  return (
    <div className="admin-badge-form">
      <div className="admin-badge-form-head">
        <h4>
          <i className={`fa-solid ${isNew ? 'fa-plus' : 'fa-pen'}`} />
          {isNew ? '새 뱃지' : '뱃지 수정'}
        </h4>
      </div>

      <div className="admin-badge-form-grid">
        {/* 제목 */}
        <div className="admin-badge-form-field full">
          <label>제목 <span className="req">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => patchForm('title', e.target.value)}
            placeholder="예: 첫 칭찬"
            maxLength={50}
          />
        </div>

        {/* 코드 */}
        <div className="admin-badge-form-field full">
          <label>
            코드 <span className="req">*</span>
            <span className="hint">영문 소문자, 숫자, 밑줄만 — 한번 정하면 변경 비추천</span>
          </label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => patchForm('code', e.target.value.replace(/[^a-z0-9_]/g, ''))}
            placeholder="first_kudos_received"
            maxLength={50}
          />
        </div>

        {/* 설명 */}
        <div className="admin-badge-form-field full">
          <label>설명 <span className="req">*</span></label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => patchForm('description', e.target.value)}
            placeholder="첫 칭찬을 받았어요"
            maxLength={200}
          />
        </div>

        {/* 조건 타입 — 명시적 선택 */}
        <div className="admin-badge-form-field full">
          <label>
            조건 타입 <span className="req">*</span>
            <span className="hint">이 활동의 누적 횟수로 자동 평가돼요</span>
          </label>
          <div className="admin-badge-condition-grid">
            {CONDITION_TYPES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`admin-badge-condition-btn ${form.condition_type === c.value ? 'active' : ''}`}
                style={
                  form.condition_type === c.value
                    ? { background: c.color, borderColor: c.color, color: '#fff' }
                    : { color: c.color, borderColor: `${c.color}50` }
                }
                onClick={() => patchForm('condition_type', c.value)}
              >
                <i className={`fa-solid ${c.icon}`} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 목표값 */}
        <div className="admin-badge-form-field">
          <label>목표값 <span className="req">*</span></label>
          <input
            type="number"
            min="1"
            value={form.condition_value}
            onChange={(e) => patchForm('condition_value', e.target.value)}
          />
        </div>

        {/* 카테고리 */}
        <div className="admin-badge-form-field">
          <label>카테고리</label>
          <select value={form.category} onChange={(e) => patchForm('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 정렬 순서 */}
        <div className="admin-badge-form-field">
          <label>
            정렬 <span className="hint">낮을수록 위</span>
          </label>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => patchForm('sort_order', e.target.value)}
          />
        </div>

        {/* 상태 */}
        <div className="admin-badge-form-field">
          <label>상태</label>
          <select
            value={form.is_active ? 'active' : 'paused'}
            onChange={(e) => patchForm('is_active', e.target.value === 'active')}
          >
            <option value="active">활성</option>
            <option value="paused">비활성 (숨김)</option>
          </select>
        </div>

        {/* 희귀도 */}
        <div className="admin-badge-form-field full">
          <label>희귀도</label>
          <div className="admin-badge-rarity-grid">
            {Object.entries(BADGE_RARITY).map(([key, r]) => (
              <button
                key={key}
                type="button"
                className={`admin-badge-rarity-btn ${form.rarity === key ? 'active' : ''}`}
                style={
                  form.rarity === key
                    ? { background: r.color, borderColor: r.color, color: '#fff', boxShadow: `0 4px 14px ${r.glow}` }
                    : { color: r.color, borderColor: `${r.color}60` }
                }
                onClick={() => onRarityChange(key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 보너스 포인트 */}
        <div className="admin-badge-form-field full">
          <label>
            보너스 포인트 <span className="req">*</span>
            <span className="hint">획득 시 자동 지급</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.bonus_points}
            onChange={(e) => patchForm('bonus_points', e.target.value)}
          />
        </div>

        {/* 아이콘 */}
        <div className="admin-badge-form-field full">
          <label>아이콘</label>
          <div className="admin-badge-icon-grid">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`admin-badge-icon-btn ${form.icon === ic ? 'active' : ''}`}
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

        {/* 색상 */}
        <div className="admin-badge-form-field full">
          <label>색상</label>
          <div className="admin-badge-color-grid">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`admin-badge-color-btn ${form.color === c ? 'active' : ''}`}
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
      <div className="admin-badge-preview">
        <div className="admin-badge-preview-label">미리보기</div>
        <div
          className={`admin-badge-preview-card rarity-${form.rarity}`}
          style={{
            '--rarity-color': rarity.color,
            '--rarity-glow': rarity.glow,
          }}
        >
          <div className="admin-badge-preview-rarity">{rarity.label}</div>
          <div
            className="admin-badge-preview-icon"
            style={{
              background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)`,
              boxShadow: `0 0 24px ${rarity.glow}`,
            }}
          >
            <i className={`fa-solid ${form.icon}`} />
          </div>
          <h4 className="admin-badge-preview-title">{form.title || '뱃지 제목'}</h4>
          <p className="admin-badge-preview-desc">{form.description || '뱃지 설명이 여기에 표시돼요'}</p>
          <div className="admin-badge-preview-bonus">
            <i className="fa-solid fa-coins" /> +{form.bonus_points || 0}P
          </div>
        </div>
      </div>

      <div className="admin-badge-form-actions">
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