// 조직도 우측 — 멤버 카드 그리드 (코맨드 센터 2단계).
// 부서별 색상 배경 / 온라인 상태 / 생일·입사 정보 / 호버 액션.

import { useOrgChart } from '../../contexts/OrgChartContext';
import { useMessenger } from '../../contexts/MessengerContext';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonCardGrid } from '../common/Skeleton';

function avatarUrl(m) {
  if (m?.avatar_url) return m.avatar_url;
  return `https://i.pravatar.cc/150?u=${m?.id || 'x'}`;
}

/* 생일 D-day 계산 — 올해 또는 내년 생일까지 일수 */
function birthdayDday(birthday) {
  if (!birthday) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const b = new Date(birthday);
  const thisYearBday = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (thisYearBday < today) {
    thisYearBday.setFullYear(today.getFullYear() + 1);
  }
  const diffMs = thisYearBday - today;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { days, label: `${b.getMonth() + 1}/${b.getDate()}` };
}

/* 입사 연차 계산 */
function tenureYears(hiredAt) {
  if (!hiredAt) return null;
  const start = new Date(hiredAt);
  const now = new Date();
  const years = (now - start) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1) {
    const months = Math.floor(years * 12);
    return months <= 0 ? '신규 입사' : `${months}개월차`;
  }
  return `${Math.floor(years)}년차`;
}

/* 검색어 하이라이트 */
function highlight(text, keyword) {
  if (!keyword || !text) return text;
  const kw = keyword.trim();
  if (!kw) return text;
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="org-highlight">{text.slice(idx, idx + kw.length)}</mark>
      {text.slice(idx + kw.length)}
    </>
  );
}

/* 온라인 상태 판단 — status_msg 가 있으면 온라인으로 가정.
   실제 presence 시스템 있으면 그걸 사용. */
function getOnlineStatus(m) {
  /* TODO: 실제 presence 연동 시 m.last_seen_at 같은 필드 활용 */
  if (m.status_msg) return 'online';
  return 'offline';
}

export default function OrgChartGrid() {
  const {
    filteredMembers,
    loading,
    openDetail,
    search,
    selectedDept,
    quickFilter,
    kpi,
    getDeptInfo,
  } = useOrgChart();
  const { openWith } = useMessenger();
  const toast = useToast();

  if (loading) {
    return <SkeletonCardGrid count={8} minWidth={240} />;
  }

  if (filteredMembers.length === 0) {
    return (
      <div className="org-grid-empty">
        <i className="fa-regular fa-face-frown" />
        <p>
          {search ? (
            <>"<strong>{search}</strong>" 검색 결과가 없어요</>
          ) : selectedDept ? (
            <>"<strong>{selectedDept}</strong>" 부서에 직원이 없어요</>
          ) : quickFilter === 'birthday' ? (
            '이번 달 생일자가 없어요'
          ) : quickFilter === 'new_joiner' ? (
            '최근 3개월 입사자가 없어요'
          ) : quickFilter === 'admin' ? (
            '관리자가 없어요'
          ) : (
            '등록된 직원이 없어요'
          )}
        </p>
      </div>
    );
  }

  const handleMessage = (e, m) => {
    e.stopPropagation();
    if (typeof openWith === 'function') {
      openWith(m.id, m.full_name, m.avatar_url);
    } else {
      toast.info('메신저를 사용할 수 없어요.');
    }
  };

  const handleCopyPhone = (e, m) => {
    e.stopPropagation();
    if (!m.phone) {
      toast.info('전화번호가 등록되지 않았어요.');
      return;
    }
    navigator.clipboard?.writeText(m.phone)
      .then(() => toast.success(`${m.full_name}님 전화번호 복사됨`))
      .catch(() => toast.error('복사 실패'));
  };

  /* 결과 카운트 표시 */
  const resultCount = filteredMembers.length;

  return (
    <div className="org-grid-wrap">
      <div className="org-result-bar">
        <span className="org-result-count">
          <i className="fa-solid fa-users" />
          <strong>{resultCount}</strong>명 표시 중
        </span>
      </div>

      <div className="org-card-grid">
        {filteredMembers.map((m) => {
          const deptInfo = getDeptInfo(m.department);
          const bday = birthdayDday(m.birthday);
          const tenure = tenureYears(m.hired_at);
          const onlineStatus = getOnlineStatus(m);
          const isAdmin = m.is_admin;
          const isBirthdayToday = bday?.days === 0;
          const isBirthdayThisMonth = kpi.birthdayIds.has(m.id);
          const isNewJoiner = kpi.newJoinerIds.has(m.id);

          return (
            <div
              key={m.id}
              className="org-member-card"
              onClick={() => openDetail(m)}
              style={{
                '--card-dept-color': deptInfo.color,
              }}
            >
              {/* 상단 그라데이션 배경 */}
              <div
                className="org-card-banner"
                style={{
                  background: `linear-gradient(135deg, ${deptInfo.color}, ${deptInfo.color}99)`,
                }}
              >
                {/* 부서 아이콘 워터마크 */}
                <i
                  className={`fa-solid ${deptInfo.icon} org-card-banner-icon`}
                />

                {/* 우상단 뱃지들 */}
                <div className="org-card-badges">
                  {isBirthdayToday && (
                    <span className="org-card-badge bday-today" title="오늘 생일!">
                      🎂
                    </span>
                  )}
                  {isNewJoiner && !isBirthdayToday && (
                    <span className="org-card-badge new-joiner" title="신규 입사자">
                      <i className="fa-solid fa-sparkles" />
                    </span>
                  )}
                </div>
              </div>

              {/* 아바타 — 배너에 걸쳐 있음 */}
              <div className="org-card-avatar-wrap">
                <div
                  className="org-card-avatar"
                  style={{ backgroundImage: `url('${avatarUrl(m)}')` }}
                />
                {/* 온라인 상태 점 */}
                <span className={`org-card-presence ${onlineStatus}`} />
                {/* 관리자 왕관 */}
                {isAdmin && (
                  <span className="org-card-crown" title="관리자">
                    <i className="fa-solid fa-crown" />
                  </span>
                )}
              </div>

              {/* 본문 */}
              <div className="org-card-body">
                <h4 className="org-card-name">
                  {highlight(m.full_name || '이름 없음', search)}
                </h4>

                <div className="org-card-position">
                  {m.position && (
                    <>
                      <span className="org-card-pos">{m.position}</span>
                      <span className="org-card-sep">·</span>
                    </>
                  )}
                  <span
                    className="org-card-dept"
                    style={{ color: deptInfo.color }}
                  >
                    {highlight(m.department || '미지정', search)}
                  </span>
                </div>

                {m.status_msg && (
                  <p className="org-card-status-msg" title={m.status_msg}>
                    "{m.status_msg}"
                  </p>
                )}

                {/* 메타 정보 — 생일 / 입사 */}
                {(bday || tenure) && (
                  <div className="org-card-meta">
                    {bday && (
                      <span className={`org-card-meta-chip ${isBirthdayToday ? 'today' : ''}`}>
                        <i className="fa-solid fa-cake-candles" />
                        {bday.label}
                        {bday.days === 0 ? ' 🎉' : ` (D-${bday.days})`}
                      </span>
                    )}
                    {tenure && (
                      <span className="org-card-meta-chip">
                        <i className="fa-solid fa-calendar-check" />
                        {tenure}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 빠른 액션 (호버) */}
              <div className="org-card-quick-actions">
                <button
                  type="button"
                  className="org-quick-btn message"
                  onClick={(e) => handleMessage(e, m)}
                  title="메시지"
                >
                  <i className="fa-solid fa-message" />
                </button>
                <button
                  type="button"
                  className="org-quick-btn phone"
                  onClick={(e) => handleCopyPhone(e, m)}
                  title={m.phone ? `전화번호 복사: ${m.phone}` : '전화번호 없음'}
                  disabled={!m.phone}
                >
                  <i className="fa-solid fa-phone" />
                </button>
                <button
                  type="button"
                  className="org-quick-btn detail"
                  onClick={() => openDetail(m)}
                  title="상세 보기"
                >
                  <i className="fa-solid fa-arrow-right" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}