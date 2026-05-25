import { useEffect, useState } from 'react';
import { useApproval } from '../contexts/ApprovalContext';
import ApprovalKPI from '../components/approval/ApprovalKPI';
import ApprovalFilterBar from '../components/approval/ApprovalFilterBar';
import ApprovalTable from '../components/approval/ApprovalTable';
import ApprovalWriteModal from '../components/approval/ApprovalWriteModal';
import ApprovalViewModal from '../components/approval/ApprovalViewModal';   // ⭐

export default function Approval() {
  const { fetchApprovals } = useApproval();
  const [writeOpen, setWriteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);          // ⭐
  const [selectedDocId, setSelectedDocId] = useState(null);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleSelectDoc = (docId) => {
    setSelectedDocId(docId);
    setViewOpen(true);   // ⭐ 상세 모달 열기
  };

  return (
    <div className="approval-page">
      <header className="approval-page-header">
        <div className="approval-header-left">
          <h2>
            <i className="fa-solid fa-file-signature"></i> 전자 결재
          </h2>
          <span>기안 작성부터 결재 승인까지 한 곳에서 처리하세요.</span>
        </div>
        <button
          className="approval-write-btn"
          onClick={() => setWriteOpen(true)}
        >
          <i className="fa-solid fa-pen-to-square"></i> 기안 작성
        </button>
      </header>

      <ApprovalKPI />

      <div className="board-container">
        <ApprovalFilterBar />
        <ApprovalTable onSelectDoc={handleSelectDoc} />
      </div>

      <ApprovalWriteModal
        isOpen={writeOpen}
        onClose={() => setWriteOpen(false)}
        onComplete={fetchApprovals}
      />

      {/* ⭐ 결재 상세 모달 */}
      <ApprovalViewModal
        docId={selectedDocId}
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        onComplete={fetchApprovals}
      />
    </div>
  );
}