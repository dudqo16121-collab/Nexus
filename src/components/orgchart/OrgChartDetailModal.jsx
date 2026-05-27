// 직원 상세 모달 — 코맨드 센터 4단계 풀 강화.
// 부서 배너 / 빠른 액션 / 업무 현황 / 같은 팀.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { useMessenger } from '../../contexts/MessengerContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import BookmarkButton from '../common/BookmarkButton';

function avatarUrl(m) {
  if (m?.avatar_url) return m.avatar_url;
  return `https://i.pravatar.cc/150?u=${m?.id || 'x'}`;
}

function birthdayInfo(birthday) {
  if (!birthday) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const b = new Date(birthday);
  const thisYearBday = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (thisYearBday < today) {
    thisYearBday.setFullYear(today.getFullYear() + 1);
  }
  const days = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24));
  return {
    label: `${b.getMonth() + 1}월 ${b.getDate()}일`,
    days,
    isToday: days === 0,
  };
}

function tenureInfo(hiredAt) {
  if (!hiredAt) return null;
  const start = new Date(hiredAt);
  const now = new Date();
  const years = (now - start) / (365.25 * 24 * 60 * 60 * 1000);
  let label;
  if (years < 1) {
    const months = Math.floor(years * 12);
    label = months <= 0 ? '신규 입사' : `${months}개월차`;
  } else {
    label = `${Math.floor(years)}년차`;
  }
  return {
    date: start.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
    label,
  };
}

export default function OrgChartDetailModal() {
  const navigate = useNavigate();
  const { detailModal, closeDetail, openDetail, members, getDeptInfo } = useOrgChart();
  const { openWith } = useMessenger();
  const toast = useToast();

  const { open, member: m } = detailModal;

  /* 업무 현황 — 모달 열릴 때 한 번 로드 */
  const [workload, setWorkload] = useState({
    projects: null,
    pendingApprovals: null,
    weekMeetings: null,
    loading: false,
  });

  useEffect(() => {
    if (!open || !m?.id) {
      setWorkload({ projects: null, pendingApprovals: null, weekMeetings: null, loading: false });
      return;
    }

    let cancelled = false;
    (async () => {
      setWorkload((prev) => ({ ...prev, loading: true }));

      try {
        /* 진행 중 프로젝트 — 멤버로 참여 또는 owner */
        const { count: ownerCount } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', m.id)
          .not('status', 'in', '(done,completed,archived)');

        const { count: memberCount } = await supabase
          .from('project_members')
          .select('project_id', { count: 'exact', head: true })
          .eq('user_id', m.id);

        const projectCount = (ownerCount || 0) + (memberCount || 0);

        /* 결재 대기 — 이 사람이 현재 결재자인 문서 (대략적) */
        const { data: approvals } = await supabase
          .from('approvals')
          .select('id, approvers, current_step, status')
          .in('status', ['pending', 'in_progress']);

        const pendingForMe = (approvals || []).filter((doc) => {
          const step = doc.current_step || 0;
          return doc.approvers?.[step]?.id === m.id;
        }).length;

        /* 이번 주 회의 — meetings 테이블이 있다면 */
        const weekStart = new Date();
        weekStart.setHours(0, 0, 0, 0);
        const day = weekStart.getDay() || 7;
        weekStart.setDate(weekStart.getDate() - (day - 1));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        let meetingCount = 0;
        try {
          const { count } = await supabase
            .from('meetings')
            .select('id', { count: 'exact', head: true })
            .gte('start_at', weekStart.toISOString())
            .lt('start_at', weekEnd.toISOString())
            .contains('attendee_ids', [m.id]);
          meetingCount = count || 0;
        } catch {
          /* meetings 테이블 없거나 attendee_ids 필드가 다른 경우 무시 */
        }

        if (!cancelled) {
          setWorkload({
            projects: projectCount,
            pendingApprovals: pendingForMe,
            weekMeetings: meetingCount,
            loading: false,
          });
        }
      } catch (e) {
        console.warn('[OrgChartDetail] workload fetch:', e);
        if (!cancelled) {
          setWorkload({ projects: 0, pendingApprovals: 0, weekMeetings: 0, loading: false });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [open, m?.id]);

  if (!m) return null;

  const deptInfo = getDeptInfo(m.department);
  const bday = birthdayInfo(m.birthday);
  const tenure = tenureInfo(m.hired_at);
  const isOnline = !!m.status_msg;

  /* 같은 팀 멤버 (자기 자신 제외) */
  const sameTeam = members.filter(
    (x) => x.id !== m.id && (x.department || '미지정') === (m.department || '미지정')
  );

  const handleMessage = () => {
    if (typeof openWith === 'function') {
      openWith(m.id, m.full_name, m.avatar_url);
      closeDetail();
    } else {
      toast.info('메신저를 사용할 수 없어요.');
    }
  };

  const copyPhone = () => {
    if (!m.phone) {
      toast.info('전화번호가 등록되지 않았어요.');
      return;
    }
    navigator.clipboard?.writeText(m.phone)
      .then(() => toast.success('전화번호가 복사되었습니다.'))
      .catch(() => toast.error('복사 실패'));
  };

  const copyEmail = () => {
    if (!m.email) {
      toast.info('이메일이 등록되지 않았어요.');
      return;
    }
    navigator.clipboard?.writeText(m.email)
      .then(() => toast.success('이메일이 복사되었습니다.'))
      .catch(() => toast.error('복사 실패'));
  };

  const openSameMember = (member) => {
    openDetail(member);
  };

  return (
    <Modal
      isOpen={open}
      onClose={closeDetail}
      size="md"
      title={null}
      hideHeader
    >
      <div className="org-detail-v2">
        {/* 닫기 버튼 (배너 우상단) */}
        <button
          type="button"
          className="org-detail-close"
          onClick={closeDetail}
          title="닫기"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        {/* 배너 */}
        <div
          className="org-detail-banner"
          style={{
            background: `linear-gradient(135deg, ${deptInfo.color}, ${deptInfo.color}aa)`,
          }}
        >
          <i className={`fa-solid ${deptInfo.icon} org-detail-banner-icon`} />
        </div>

        {/* 아바타 + 이름 영역 */}
        <div className="org-detail-head">
          <div className="org-detail-avatar-wrap">
            <div
              className="org-detail-avatar"
              style={{ backgroundImage: `url('${avatarUrl(m)}')` }}
            />
            <span className={`org-detail-presence ${isOnline ? 'online' : 'offline'}`} />
            {m.is_admin && (
              <span className="org-detail-crown" title="관리자">
                <i className="fa-solid fa-crown" />
              </span>
            )}
          </div>

          <h2 className="org-detail-name">
            {m.full_name || '이름 없음'}
            {bday?.isToday && <span className="org-detail-bday-badge">🎂 오늘 생일!</span>}
          </h2>

          <div className="org-detail-position">
            {m.position && <span>{m.position}</span>}
            {m.position && m.department && <span className="org-detail-sep">·</span>}
            <span
              className="org-detail-dept"
              style={{ color: deptInfo.color }}
            >
              <i className={`fa-solid ${deptInfo.icon}`} />
              {m.department || '미지정'}
            </span>
          </div>

          {m.status_msg && (
            <p className="org-detail-status-msg">"{m.status_msg}"</p>
          )}
        </div>

        {/* 빠른 액션 */}
        <div className="org-detail-actions">
          <button
            type="button"
            className="org-detail-action message"
            onClick={handleMessage}
          >
            <i className="fa-solid fa-message" />
            <span>메시지</span>
          </button>
          <button
            type="button"
            className="org-detail-action phone"
            onClick={copyPhone}
            disabled={!m.phone}
            title={m.phone || '전화번호 없음'}
          >
            <i className="fa-solid fa-phone" />
            <span>전화</span>
          </button>
          <button
            type="button"
            className="org-detail-action email"
            onClick={copyEmail}
            disabled={!m.email}
            title={m.email || '이메일 없음'}
          >
            <i className="fa-solid fa-envelope" />
            <span>메일</span>
          </button>
          <BookmarkButton
            kind="user"
            ref_id={m.id}
            title={m.full_name}
            subtitle={m.department}
            link={`/orgchart?user=${m.id}`}
            color={deptInfo.color}
            icon="fa-user"
            buttonClassName="org-detail-action bookmark"
            iconOnly={false}
            renderLabel={(active) => <span>{active ? '즐겨찾기됨' : '즐겨찾기'}</span>}
          />
        </div>

        {/* 기본 정보 */}
        <div className="org-detail-section">
          <h4 className="org-detail-section-title">
            <i className="fa-solid fa-circle-info" />
            기본 정보
          </h4>
          <div className="org-detail-info-grid">
            {bday && (
              <div className={`org-detail-info-row ${bday.isToday ? 'highlight' : ''}`}>
                <span className="org-detail-info-label">
                  <i className="fa-solid fa-cake-candles" />
                  생일
                </span>
                <strong className="org-detail-info-value">
                  {bday.label}
                  {bday.isToday ? ' 🎉' : ` (D-${bday.days})`}
                </strong>
              </div>
            )}
            {tenure && (
              <div className="org-detail-info-row">
                <span className="org-detail-info-label">
                  <i className="fa-solid fa-calendar-check" />
                  입사일
                </span>
                <strong className="org-detail-info-value">
                  {tenure.date} <span className="org-detail-tenure-chip">{tenure.label}</span>
                </strong>
              </div>
            )}
            {m.phone && (
              <div className="org-detail-info-row">
                <span className="org-detail-info-label">
                  <i className="fa-solid fa-phone" />
                  전화
                </span>
                <strong className="org-detail-info-value mono">{m.phone}</strong>
              </div>
            )}
            {m.email && (
              <div className="org-detail-info-row">
                <span className="org-detail-info-label">
                  <i className="fa-solid fa-envelope" />
                  이메일
                </span>
                <strong className="org-detail-info-value mono">{m.email}</strong>
              </div>
            )}
            {!bday && !tenure && !m.phone && !m.email && (
              <div className="org-detail-info-empty">
                등록된 추가 정보가 없어요
              </div>
            )}
          </div>
        </div>

        {/* 업무 현황 */}
        <div className="org-detail-section">
          <h4 className="org-detail-section-title">
            <i className="fa-solid fa-briefcase" />
            업무 현황
            <span className="org-detail-section-sub">실시간</span>
          </h4>

          {workload.loading ? (
            <div className="org-detail-workload-loading">
              <i className="fa-solid fa-spinner fa-spin" /> 불러오는 중...
            </div>
          ) : (
            <div className="org-detail-workload">
              <button
                type="button"
                className="org-detail-workload-card"
                onClick={() => {
                  closeDetail();
                  navigate('/project');
                }}
              >
                <div className="org-detail-workload-icon" style={{ background: 'rgba(67, 97, 238, 0.12)', color: '#4361ee' }}>
                  <i className="fa-solid fa-diagram-project" />
                </div>
                <div className="org-detail-workload-body">
                  <strong>{workload.projects ?? 0}</strong>
                  <span>진행 중 프로젝트</span>
                </div>
              </button>

              <button
                type="button"
                className="org-detail-workload-card"
                onClick={() => {
                  closeDetail();
                  navigate('/approval');
                }}
              >
                <div className="org-detail-workload-icon" style={{ background: 'rgba(247, 37, 133, 0.12)', color: '#f72585' }}>
                  <i className="fa-solid fa-stamp" />
                </div>
                <div className="org-detail-workload-body">
                  <strong>{workload.pendingApprovals ?? 0}</strong>
                  <span>결재 대기</span>
                </div>
              </button>

              <button
                type="button"
                className="org-detail-workload-card"
                onClick={() => {
                  closeDetail();
                  navigate('/meetings');
                }}
              >
                <div className="org-detail-workload-icon" style={{ background: 'rgba(6, 214, 160, 0.12)', color: '#06d6a0' }}>
                  <i className="fa-solid fa-video" />
                </div>
                <div className="org-detail-workload-body">
                  <strong>{workload.weekMeetings ?? 0}</strong>
                  <span>이번 주 회의</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 같은 팀 */}
        {sameTeam.length > 0 && (
          <div className="org-detail-section">
            <h4 className="org-detail-section-title">
              <i className="fa-solid fa-people-group" />
              같은 팀
              <span className="org-detail-section-sub">{sameTeam.length}명</span>
            </h4>
            <div className="org-detail-team">
              {sameTeam.slice(0, 12).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="org-detail-team-chip"
                  onClick={() => openSameMember(t)}
                  title={t.full_name}
                >
                  <div
                    className="org-detail-team-avatar"
                    style={{ backgroundImage: `url('${avatarUrl(t)}')` }}
                  />
                  <span>{t.full_name}</span>
                </button>
              ))}
              {sameTeam.length > 12 && (
                <span className="org-detail-team-more">
                  +{sameTeam.length - 12}명 더
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}