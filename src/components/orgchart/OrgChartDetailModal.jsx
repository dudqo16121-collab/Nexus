// 직원 상세 모달 — 전체 정보 + 메신저 DM 진입 + 연락처 복사.

import Modal from '../common/Modal';
import { useOrgChart } from '../../contexts/OrgChartContext';
import { useMessenger } from '../../contexts/MessengerContext';
import { useToast } from '../../contexts/ToastContext';
import BookmarkButton from '../common/BookmarkButton';

function avatarUrl(m) {
  if (m?.avatar_url) return m.avatar_url;
  return `https://i.pravatar.cc/150?u=${m?.id || 'x'}`;
}

export default function OrgChartDetailModal() {
  const { detailModal, closeDetail } = useOrgChart();
  const { openWith } = useMessenger();
  const toast = useToast();

  const { open, member: m } = detailModal;
  if (!m) return null;

  const handleMessage = () => {
    if (typeof openWith === 'function') {
      openWith(m.id, m.full_name, m.avatar_url);
      closeDetail();
    } else {
      toast.info('메신저를 사용할 수 없어요.');
    }
  };

  const copyPhone = () => {
    if (!m.phone) return;
    navigator.clipboard?.writeText(m.phone)
      .then(() => toast.success('연락처가 복사되었습니다.'))
      .catch(() => toast.error('복사 실패'));
  };

  return (
    <Modal
      isOpen={open}
      onClose={closeDetail}
      size="sm"
      title="직원 정보"
      headerExtra={
        <BookmarkButton
          kind="member"
          refId={m.id}
          title={m.full_name || '이름 없음'}
          subtitle={m.department || '미지정'}
          link={`/orgchart?member=${m.id}`}
        />
      }
    >
      <div className="org-detail">
        <div
          className="org-detail-avatar"
          style={{ backgroundImage: `url('${avatarUrl(m)}')` }}
        />
        <h3 className="org-detail-name">
          {m.full_name || '이름 없음'}
          {m.is_admin && (
            <span className="org-detail-badge">
              <i className="fa-solid fa-shield-halved" /> 관리자
            </span>
          )}
        </h3>
        <div className="org-detail-dept">{m.department || '미지정'}</div>

        {m.status_msg && (
          <div className="org-detail-status">"{m.status_msg}"</div>
        )}

        <div className="org-detail-rows">
          <div className="org-detail-row">
            <span className="org-detail-label">
              <i className="fa-solid fa-phone" /> 연락처
            </span>
            <span className="org-detail-value">
              {m.phone || <em style={{ opacity: 0.6 }}>미등록</em>}
              {m.phone && (
                <button
                  type="button"
                  className="org-copy-btn"
                  onClick={copyPhone}
                  title="복사"
                >
                  <i className="fa-regular fa-copy" />
                </button>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="modal-buttons">
        <button type="button" className="btn btn-out" onClick={closeDetail}>
          닫기
        </button>
        &nbsp;
        <button type="button" className="btn btn-in" onClick={handleMessage}>
          <i className="fa-regular fa-comment-dots" /> 메시지 보내기
        </button>
      </div>
    </Modal>
  );
}