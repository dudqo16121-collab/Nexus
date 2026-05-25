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