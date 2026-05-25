// components/wiki/WikiModal.jsx
// 모달 형태 위키 — QuickToolbar 등에서 빠른 진입용.
// 컨테이너 폭만 다르고 Sidebar/Editor 자체는 재사용.

import { useEffect } from 'react';
import Modal from '../common/Modal';
import WikiSidebar from './WikiSidebar';
import WikiEditor from './WikiEditor';
import { useWiki } from '../../contexts/WikiContext';

export default function WikiModal({ isOpen, onClose }) {
  const { fetchDocuments } = useWiki();

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="사내 위키" size="xl">
      <div className="wiki-container">
        <WikiSidebar />
        <WikiEditor />
      </div>
    </Modal>
  );
}