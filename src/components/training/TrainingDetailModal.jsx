// 과정 상세 + 신청 + 관리자 액션.

import { useState } from 'react';
import Modal from '../common/Modal';
import { useTraining, CATEGORIES, STATUS_META } from '../../contexts/TrainingContext';
import { useToast } from '../../contexts/ToastContext';
import { useOrgChart } from '../../contexts/OrgChartContext';
import BookmarkButton from '../common/BookmarkButton';

export default function TrainingDetailModal() {
  const {
    detailModal, closeDetail,
    courses, getMyEnrollment, getCourseEnrollments,
    isAdmin,
    applyToCourse, cancelMyEnrollment, decideEnrollment,
    openEditor, deleteCourse,
  } = useTraining();
  const { members } = useOrgChart() || { members: [] };
  const toast = useToast();
  const [applying, setApplying] = useState(false);
  const [note, setNote] = useState('');

  const course = courses.find((c) => c.id === detailModal.courseId);
  if (!course) return null;

  const cat = CATEGORIES.find((x) => x.id === course.category) || CATEGORIES[5];
  const my = getMyEnrollment(course.id);
  const enrollments = isAdmin ? getCourseEnrollments(course.id) : [];
  const findUser = (id) => members.find((u) => u.id === id);

  const handleApply = async () => {
    setApplying(true);
    const res = await applyToCourse(course.id, note);
    setApplying(false);
    if (res.ok) {
      toast.success('신청이 접수되었어요. 관리자 승인 후 진행됩니다.');
      setNote('');
    } else {
      toast.error(res.error);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('신청을 취소하시겠습니까?')) return;
    const res = await cancelMyEnrollment(my.id);
    if (res.ok) toast.success('신청을 취소했어요.');
    else toast.error(res.error);
  };

  const handleDecide = async (enrollmentId, status) => {
    const labels = { approved: '승인', rejected: '반려', completed: '이수 처리', pending: '대기로 변경' };
    if (!window.confirm(`이 신청을 ${labels[status]}하시겠습니까?`)) return;
    const res = await decideEnrollment(enrollmentId, status);
    if (res.ok) toast.success(`${labels[status]} 완료`);
    else toast.error(res.error);
  };

  const handleDeleteCourse = async () => {
    if (!window.confirm('이 과정을 삭제하시겠습니까? 모든 신청 내역도 함께 삭제됩니다.')) return;
    const res = await deleteCourse(course.id);
    if (res.ok) {
      toast.success('과정이 삭제되었어요.');
      closeDetail();
    } else toast.error(res.error);
  };

  return (
    <Modal
      isOpen={detailModal.open}
      onClose={closeDetail}
      size="md"
      title=""
      headerExtra={
        <BookmarkButton
          kind="training"
          refId={course.id}
          title={course.title}
          subtitle={course.instructor || cat.label}
          link="/training"
        />
      }
    >
      <div className="training-detail">
        <div className="training-detail-cat" style={{ color: cat.color }}>
          <i className={`fa-solid ${cat.icon}`} /> {cat.label}
        </div>
        <h2 className="training-detail-title">{course.title}</h2>

        {course.description && (
          <p className="training-detail-desc">{course.description}</p>
        )}

        <div className="training-detail-info">
          {course.instructor && (
            <div className="training-detail-info-row">
              <i className="fa-solid fa-user-tie" />
              <span>강사</span>
              <strong>{course.instructor}</strong>
            </div>
          )}
          {(course.start_date || course.end_date) && (
            <div className="training-detail-info-row">
              <i className="fa-regular fa-calendar" />
              <span>일정</span>
              <strong>
                {course.start_date ? new Date(course.start_date).toLocaleDateString('ko-KR') : '?'}
                {course.end_date && course.end_date !== course.start_date && (
                  <> ~ {new Date(course.end_date).toLocaleDateString('ko-KR')}</>
                )}
              </strong>
            </div>
          )}
          {course.location && (
            <div className="training-detail-info-row">
              <i className="fa-solid fa-location-dot" />
              <span>장소</span>
              <strong>{course.location}</strong>
            </div>
          )}
          <div className="training-detail-info-row">
            <i className="fa-solid fa-users" />
            <span>정원</span>
            <strong>{course.capacity}명</strong>
          </div>
        </div>

        {/* 내 신청 상태 */}
        {my && (
          <div
            className="training-detail-mystatus"
            style={{
              background: `${STATUS_META[my.status].color}10`,
              borderColor: `${STATUS_META[my.status].color}40`,
              color: STATUS_META[my.status].color,
            }}
          >
            <i className={`fa-solid ${STATUS_META[my.status].icon}`} />
            <strong>{STATUS_META[my.status].label}</strong>
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem' }}>
              {new Date(my.applied_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
        )}

        {/* 신청 폼 (미신청 + 모집 중일 때) */}
        {!my && course.status === 'open' && (
          <div className="training-detail-applyform">
            <label>신청 메모 (선택)</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="관리자에게 전할 메모 (예: 우선 이수가 필요한 이유 등)"
            />
          </div>
        )}

        {/* 관리자 — 신청자 목록 */}
        {isAdmin && (
          <div className="training-detail-enrollments">
            <h4>
              <i className="fa-solid fa-clipboard-list" /> 신청 현황 ({enrollments.length})
            </h4>
            {enrollments.length === 0 ? (
              <div className="training-empty-small">아직 신청자가 없어요</div>
            ) : (
              <div className="training-enroll-list">
                {enrollments.map((e) => {
                  const u = findUser(e.user_id);
                  return (
                    <div key={e.id} className="training-enroll-row">
                      <div className="training-enroll-user">
                        <strong>{u?.full_name || '알 수 없음'}</strong>
                        {u?.department && <span> · {u.department}</span>}
                        {e.note && <div className="training-enroll-note">"{e.note}"</div>}
                      </div>
                      <span
                        className="training-enroll-status"
                        style={{
                          background: `${STATUS_META[e.status].color}15`,
                          color: STATUS_META[e.status].color,
                        }}
                      >
                        {STATUS_META[e.status].label}
                      </span>
                      <div className="training-enroll-actions">
                        {e.status === 'pending' && (
                          <>
                            <button type="button" className="training-mini-btn approve" onClick={() => handleDecide(e.id, 'approved')}>
                              승인
                            </button>
                            <button type="button" className="training-mini-btn reject" onClick={() => handleDecide(e.id, 'rejected')}>
                              반려
                            </button>
                          </>
                        )}
                        {e.status === 'approved' && (
                          <button type="button" className="training-mini-btn complete" onClick={() => handleDecide(e.id, 'completed')}>
                            이수 처리
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="modal-buttons">
        {isAdmin && (
          <>
            <button
              type="button"
              className="btn"
              style={{ background: 'var(--danger)', color: '#fff' }}
              onClick={handleDeleteCourse}
            >
              삭제
            </button>
            <button
              type="button"
              className="btn btn-out"
              onClick={() => { closeDetail(); openEditor(course); }}
            >
              수정
            </button>
          </>
        )}

        {my && my.status === 'pending' && (
          <button type="button" className="btn btn-out" onClick={handleCancel}>
            신청 취소
          </button>
        )}

        <button type="button" className="btn btn-out" onClick={closeDetail}>
          닫기
        </button>

        {!my && course.status === 'open' && (
          <button type="button" className="btn btn-in" onClick={handleApply} disabled={applying}>
            {applying ? '신청 중...' : <><i className="fa-solid fa-arrow-right-to-bracket" /> 신청하기</>}
          </button>
        )}
      </div>
    </Modal>
  );
}