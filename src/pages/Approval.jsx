import { useEffect, useState } from 'react';
import { useApproval } from '../contexts/ApprovalContext';
import ApprovalKPI from '../components/approval/ApprovalKPI';
import ApprovalInsights from '../components/approval/ApprovalInsights';
import ApprovalFilterBar from '../components/approval/ApprovalFilterBar';
import ApprovalTable from '../components/approval/ApprovalTable';
import ApprovalWriteModal from '../components/approval/ApprovalWriteModal';
import ApprovalViewModal from '../components/approval/ApprovalViewModal';

export default function Approval() {
  const {
    fetchApprovals,
    powerModeActive,
    myPendingDocIds,
    exitPowerMode,
  } = useApproval();
  const [writeOpen, setWriteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  /* 빠른 모드 자동 오픈 */
  useEffect(() => {
    if (powerModeActive && myPendingDocIds.length > 0 && !viewOpen) {
      setSelectedDocId(myPendingDocIds[0]);
      setViewOpen(true);
    }
    if (powerModeActive && myPendingDocIds.length === 0) {
      exitPowerMode();
      setViewOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powerModeActive, myPendingDocIds.length]);

  const handleSelectDoc = (docId) => {
    setSelectedDocId(docId);
    setViewOpen(true);
  };

  const handleCloseView = () => {
    setViewOpen(false);
    if (powerModeActive) {
      exitPowerMode();
    }
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
        <div className="approval-header-actions">
          <button
            className={`approval-insights-btn ${insightsOpen ? 'active' : ''}`}
            onClick={() => setInsightsOpen((v) => !v)}
            title="통계 패널 토글"
          >
            <i className="fa-solid fa-chart-line"></i>
            {insightsOpen ? '통계 닫기' : '통계 보기'}
          </button>
          <button
            className="approval-write-btn"
            onClick={() => setWriteOpen(true)}
          >
            <i className="fa-solid fa-pen-to-square"></i> 기안 작성
          </button>
        </div>
      </header>

      <ApprovalKPI />

      {/* ⭐ 통계 패널 (5단계) */}
      <ApprovalInsights isOpen={insightsOpen} />

      <div className="board-container">
        <ApprovalFilterBar />
        <ApprovalTable onSelectDoc={handleSelectDoc} />
      </div>

      <ApprovalWriteModal
        isOpen={writeOpen}
        onClose={() => setWriteOpen(false)}
        onComplete={fetchApprovals}
      />

      <ApprovalViewModal
        docId={selectedDocId}
        isOpen={viewOpen}
        onClose={handleCloseView}
        onComplete={fetchApprovals}
      />
    </div>
  );
}