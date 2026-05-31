// components/hub/HubBadgesModal.jsx
// 뱃지 진열장 모달 — Hero에서 버튼 클릭 시 표시.

import Modal from '../common/Modal';
import HubBadges from './HubBadges';

export default function HubBadgesModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <span>
          <i className="fa-solid fa-medal" style={{ color: '#f59e0b', marginRight: 8 }} />
          뱃지 진열장
        </span>
      }
    >
      <HubBadges inModal />
    </Modal>
  );
}