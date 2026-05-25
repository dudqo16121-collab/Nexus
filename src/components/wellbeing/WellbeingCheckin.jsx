// 오늘 체크인 — 3단계 카드 형태.

import { useState, useEffect } from 'react';
import { useWellbeing } from '../../contexts/WellbeingContext';
import { useToast } from '../../contexts/ToastContext';

export default function WellbeingCheckin() {
  const {
    MOODS, TAGS_POSITIVE, TAGS_NEUTRAL, TAGS_NEGATIVE,
    todayCheckin, submitCheckin, streak,
  } = useWellbeing();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    mood_score: null, mood_label: '',
    energy: 5, burnout: 3, focus: 5,
    tags: [], note: '',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  /* 이미 오늘 체크인 했으면 완료 화면 */
  useEffect(() => {
    if (todayCheckin) {
      setForm({
        mood_score: todayCheckin.mood_score,
        mood_label: todayCheckin.mood_label,
        energy: todayCheckin.energy,
        burnout: todayCheckin.burnout,
        focus: todayCheckin.focus,
        tags: todayCheckin.tags || [],
        note: todayCheckin.note || '',
      });
      setDone(true);
    }
  }, [todayCheckin]);

  const patch = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSelectMood = (m) => {
    setForm((p) => ({ ...p, mood_score: m.score, mood_label: m.label }));
    setTimeout(() => setStep(1), 250);
  };

  const handleToggleTag = (t) => {
    setForm((p) => ({
      ...p,
      tags: p.tags.includes(t) ? p.tags.filter((x) => x !== t) : [...p.tags, t],
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const res = await submitCheckin(form);
    setSaving(false);
    if (res.ok) {
      toast.success('체크인 완료! 오늘도 수고했어요 💚');
      setDone(true);
    } else {
      toast.error(res.error);
    }
  };

  const handleRedo = () => {
    setDone(false);
    setStep(0);
  };

  /* === 완료 화면 === */
  if (done) {
    const mood = MOODS.find((m) => m.score === form.mood_score) || MOODS[2];
    const score = Math.round(((form.mood_score || 6) + form.energy + (10 - form.burnout) + form.focus) / 4 * 10) / 10;
    return (
      <div className="wb-done">
        <div className="wb-done-emoji">{mood.em}</div>
        <h2>오늘 체크인 완료!</h2>
        <p>내일 다시 체크인할 수 있어요. 오늘도 수고했어요 💚</p>

        <div className="wb-done-grid">
          <div>
            <div className="wb-done-label">오늘 기분</div>
            <div className="wb-done-value">{mood.em} {mood.label}</div>
          </div>
          <div>
            <div className="wb-done-label">Well-being 점수</div>
            <div className="wb-done-value" style={{ color: mood.color, fontSize: '1.5rem' }}>{score}</div>
          </div>
          <div>
            <div className="wb-done-label">에너지</div>
            <div className="wb-done-value">{'⚡'.repeat(Math.ceil(form.energy / 2))}</div>
          </div>
          <div>
            <div className="wb-done-label">번아웃</div>
            <div className="wb-done-value" style={{ color: form.burnout >= 7 ? 'var(--danger)' : '#06d6a0' }}>
              {form.burnout >= 7 ? '주의 🔴' : '양호 🟢'}
            </div>
          </div>
        </div>

        {streak > 0 && (
          <div className="wb-streak">
            🔥 <strong>{streak}일</strong> 연속 체크인 중!
          </div>
        )}

        <button type="button" className="wb-btn-ghost" onClick={handleRedo}>
          <i className="fa-solid fa-pen" /> 오늘 답변 수정하기
        </button>
      </div>
    );
  }

  /* === 진행 인디케이터 === */
  const Indicator = () => (
    <div className="wb-stepper">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`wb-stepper-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
        >
          {i < step ? <i className="fa-solid fa-check" /> : i + 1}
        </div>
      ))}
    </div>
  );

  /* === Step 0: 기분 선택 === */
  if (step === 0) {
    return (
      <div className="wb-checkin">
        <Indicator />
        <h2 className="wb-step-title">오늘 기분 어때요?</h2>
        <p className="wb-step-sub">가장 가까운 표정을 선택해주세요</p>

        <div className="wb-mood-grid">
          {MOODS.map((m) => (
            <button
              key={m.score}
              type="button"
              className={`wb-mood-btn ${form.mood_score === m.score ? 'selected' : ''}`}
              style={form.mood_score === m.score ? { borderColor: m.color, background: `${m.color}18` } : {}}
              onClick={() => handleSelectMood(m)}
            >
              <div className="wb-mood-em">{m.em}</div>
              <div className="wb-mood-label">{m.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* === Step 1: 슬라이더 3개 === */
  if (step === 1) {
    return (
      <div className="wb-checkin">
        <Indicator />
        <h2 className="wb-step-title">조금 더 알려주세요</h2>
        <p className="wb-step-sub">오늘 상태를 슬라이더로 표현해보세요</p>

        <Slider label="에너지" value={form.energy} onChange={(v) => patch('energy', v)}
          color="#ffd166" hint="피곤 ←→ 활력 넘침" />
        <Slider label="번아웃" value={form.burnout} onChange={(v) => patch('burnout', v)}
          color="#f72585" hint="여유 ←→ 소진" />
        <Slider label="집중도" value={form.focus} onChange={(v) => patch('focus', v)}
          color="#4361ee" hint="산만 ←→ 깊이 몰입" />

        <div className="wb-step-nav">
          <button type="button" className="wb-btn-ghost" onClick={() => setStep(0)}>
            <i className="fa-solid fa-arrow-left" /> 뒤로
          </button>
          <button type="button" className="wb-btn-primary" onClick={() => setStep(2)}>
            다음 <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>
    );
  }

  /* === Step 2: 태그 + 메모 === */
  return (
    <div className="wb-checkin">
      <Indicator />
      <h2 className="wb-step-title">오늘 하루를 표현해주세요</h2>
      <p className="wb-step-sub">해당되는 태그를 모두 선택 (선택사항)</p>

      <TagGroup title="긍정" color="#06d6a0" tags={TAGS_POSITIVE} selected={form.tags} onToggle={handleToggleTag} />
      <TagGroup title="중립" color="#94a3b8" tags={TAGS_NEUTRAL}  selected={form.tags} onToggle={handleToggleTag} />
      <TagGroup title="고민" color="#f72585" tags={TAGS_NEGATIVE} selected={form.tags} onToggle={handleToggleTag} />

      <label className="wb-note-label">짧은 메모 (선택)</label>
      <textarea
        rows={3}
        value={form.note}
        onChange={(e) => patch('note', e.target.value)}
        placeholder="오늘 떠오른 생각이나 느낌을 자유롭게 적어보세요"
        className="wb-note"
      />

      <div className="wb-step-nav">
        <button type="button" className="wb-btn-ghost" onClick={() => setStep(1)}>
          <i className="fa-solid fa-arrow-left" /> 뒤로
        </button>
        <button type="button" className="wb-btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? '저장 중...' : <><i className="fa-solid fa-heart-pulse" /> 체크인 완료!</>}
        </button>
      </div>
    </div>
  );
}

/* 슬라이더 하위 컴포넌트 */
function Slider({ label, value, onChange, color, hint }) {
  return (
    <div className="wb-slider-block">
      <div className="wb-slider-head">
        <strong>{label}</strong>
        <span className="wb-slider-val" style={{ color }}>{value} / 10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="wb-slider"
        style={{
          background: `linear-gradient(90deg, ${color} 0%, ${color} ${value * 10}%, var(--border-color) ${value * 10}%)`,
          '--wb-thumb': color,
        }}
      />
      <div className="wb-slider-hint">{hint}</div>
    </div>
  );
}

function TagGroup({ title, color, tags, selected, onToggle }) {
  return (
    <div className="wb-tag-group">
      <div className="wb-tag-group-title" style={{ color }}>{title}</div>
      <div className="wb-tag-list">
        {tags.map((t) => {
          const sel = selected.includes(t);
          return (
            <button
              key={t}
              type="button"
              className={`wb-tag ${sel ? 'selected' : ''}`}
              style={sel ? { borderColor: color, background: `${color}20`, color } : {}}
              onClick={() => onToggle(t)}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}