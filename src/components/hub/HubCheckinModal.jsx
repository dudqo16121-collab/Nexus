// components/hub/HubCheckinModal.jsx
// 일일 체크인 모달 — 클릭 한 번 + 기분 선택 + (선택) 메모.

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { useHub, MOOD_OPTIONS, STREAK_MILESTONES } from '../../contexts/HubContext';
import { useToast } from '../../contexts/ToastContext';

export default function HubCheckinModal() {
  const toast = useToast();
  const {
    checkinModalOpen,
    closeCheckinModal,
    checkIn,
    updateTodayNote,
    todayCheckin,
    currentStreak,
  } = useHub();

  const [mood, setMood] = useState('good');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [celebration, setCelebration] = useState(null);

  /* 이미 체크인했다면 모달에 기존 값 로드 */
  useEffect(() => {
    if (!checkinModalOpen) return;
    if (todayCheckin) {
      setMood(todayCheckin.mood);
      setNote(todayCheckin.note || '');
    } else {
      setMood('good');
      setNote('');
    }
    setCelebration(null);
  }, [checkinModalOpen, todayCheckin]);

  /* 다음 마일스톤 */
  const nextMilestone = STREAK_MILESTONES.find((m) => m > currentStreak);

  const handleCheckIn = async () => {
    setSubmitting(true);
    const res = await checkIn({ mood, note });
    setSubmitting(false);
    if (res.ok) {
      const isMilestone = STREAK_MILESTONES.includes(res.streakDay);
      setCelebration({
        points: res.pointsEarned,
        streak: res.streakDay,
        milestone: isMilestone,
      });
      toast.success(`+${res.pointsEarned}P 적립! (${res.streakDay}일 연속)`);
    } else {
      toast.error(res.error);
    }
  };

  const handleUpdateNote = async () => {
    setSubmitting(true);
    const res = await updateTodayNote(note);
    setSubmitting(false);
    if (res.ok) {
      toast.success('메모를 저장했어요.');
      closeCheckinModal();
    } else {
      toast.error(res.error);
    }
  };

  /* 체크인 성공 후 축하 화면 */
  if (celebration) {
    return (
      <Modal
        isOpen={checkinModalOpen}
        onClose={closeCheckinModal}
        size="sm"
        title=""
        hideCloseButton={false}
      >
        <div className="hub-checkin-celebration">
          <div className={`hub-checkin-burst ${celebration.milestone ? 'milestone' : ''}`}>
            {celebration.milestone ? '🎉' : '✨'}
          </div>
          <h3>오늘도 체크인 완료!</h3>
          <div className="hub-checkin-points">
            +{celebration.points}P
          </div>
          <div className="hub-checkin-streak">
            🔥 <strong>{celebration.streak}일</strong> 연속 출석
          </div>
          {celebration.milestone && (
            <div className="hub-checkin-milestone-msg">
              🏆 마일스톤 달성!
            </div>
          )}
          <button
            type="button"
            className="hub-checkin-close-btn"
            onClick={closeCheckinModal}
          >
            확인
          </button>
        </div>
      </Modal>
    );
  }

  const isAlreadyCheckedIn = !!todayCheckin;
  const selectedMood = MOOD_OPTIONS.find((m) => m.value === mood);

  return (
    <Modal
      isOpen={checkinModalOpen}
      onClose={closeCheckinModal}
      size="sm"
      title={isAlreadyCheckedIn ? '오늘의 메모' : '오늘의 체크인'}
    >
      <div className="hub-checkin-form">
        {/* 현재 streak 표시 */}
        <div className="hub-checkin-streak-info">
          <div className="hub-checkin-streak-fire">🔥</div>
          <div>
            <div className="hub-checkin-streak-num">
              {isAlreadyCheckedIn ? currentStreak : currentStreak + (currentStreak === 0 ? 1 : 0)}
              <span>일 연속</span>
            </div>
            {nextMilestone && !isAlreadyCheckedIn && (
              <div className="hub-checkin-next">
                {nextMilestone}일까지 {nextMilestone - currentStreak}일 남았어요
              </div>
            )}
          </div>
          {!isAlreadyCheckedIn && (
            <div className="hub-checkin-reward">
              <span>+{(currentStreak + 1) * 5}P</span>
              <small>오늘 보상</small>
            </div>
          )}
        </div>

        {/* 기분 선택 */}
        <label className="hub-checkin-label">오늘 기분은 어때요?</label>
        <div className="hub-checkin-mood-grid">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.value}
              type="button"
              disabled={isAlreadyCheckedIn}
              className={`hub-checkin-mood-btn ${mood === m.value ? 'active' : ''}`}
              style={
                mood === m.value
                  ? { borderColor: m.color, background: `${m.color}15` }
                  : undefined
              }
              onClick={() => setMood(m.value)}
            >
              <span className="hub-checkin-mood-emoji">{m.emoji}</span>
              <span className="hub-checkin-mood-label">{m.label}</span>
            </button>
          ))}
        </div>

        {/* 한 줄 메모 (본인만) */}
        <label className="hub-checkin-label">
          오늘 한 마디 <span className="hub-checkin-label-hint">— 본인만 볼 수 있어요</span>
        </label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="오늘 기억하고 싶은 한 마디를 적어보세요. 나중에 캘린더에서 다시 볼 수 있어요."
          className="hub-checkin-textarea"
          maxLength={200}
        />
      </div>

      <div className="modal-buttons">
        <button
          type="button"
          className="btn btn-out"
          onClick={closeCheckinModal}
          disabled={submitting}
        >
          닫기
        </button>
        {isAlreadyCheckedIn ? (
          <button
            type="button"
            className="btn btn-in"
            onClick={handleUpdateNote}
            disabled={submitting}
          >
            {submitting ? '저장 중...' : <><i className="fa-solid fa-pen" /> 메모 저장</>}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-in"
            onClick={handleCheckIn}
            disabled={submitting}
            style={{
              background: `linear-gradient(135deg, ${selectedMood?.color || '#4361ee'}, #8338ec)`,
            }}
          >
            {submitting ? '체크인 중...' : <><i className="fa-solid fa-check" /> 체크인 ({(currentStreak + 1) * 5}P)</>}
          </button>
        )}
      </div>
    </Modal>
  );
}