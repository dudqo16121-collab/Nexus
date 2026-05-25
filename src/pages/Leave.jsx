// pages/Leave.jsx
// 근태/연차 관리 메인 페이지.
// 원본 index.html <section id="view-leave"> 전체를 React 로 이관.
//
// 구조 (결재 페이지 패턴과 동일):
//   LeaveHeader          — 연도 필터 + 휴가 신청 버튼
//   LeaveSummaryWidgets  — 연차 요약 위젯 4개
//   AttendanceSummary    — 이번달 근태 요약
//   LeaveHistoryTable    — 휴가 신청 내역
//
// 모달은 결재 페이지 컴포넌트를 그대로 재사용한다:
//   ApprovalWriteModal — 휴가 신청 (initialType='연차신청서' 자동 선택)
//   ApprovalViewModal  — 휴가 내역 상세 보기
// 모달 열림 상태는 LeaveContext 가 관리한다 (원본 openLeaveModal / openApprovalView 대응).
//
// 데이터는 LeaveProvider 가 공급한다. App 라우터에서 이 페이지를
// <LeaveProvider> 로 감싸거나, 전역 Provider 트리에 LeaveProvider 를 추가할 것.
// (ApprovalWriteModal 내부가 useApproval 을 쓰므로 LeaveProvider 는
//  ApprovalProvider 안쪽에 있어야 한다.)

import { useLeave } from '../contexts/LeaveContext';
import { LEAVE_FORM_TYPE } from '../config/leaveTypes';

import LeaveHeader from '../components/leave/LeaveHeader';
import LeaveSummaryWidgets from '../components/leave/LeaveSummaryWidgets';
import AttendanceSummary from '../components/leave/AttendanceSummary';
import LeaveHistoryTable from '../components/leave/LeaveHistoryTable';

import ApprovalWriteModal from '../components/approval/ApprovalWriteModal';
import ApprovalViewModal from '../components/approval/ApprovalViewModal';

export default function Leave() {
  const {
    refresh,
    writeModalOpen,
    closeLeaveWrite,
    viewModalDocId,
    closeLeaveDetail,
  } = useLeave();

  return (
    <section id="view-leave">
      <LeaveHeader />
      <LeaveSummaryWidgets />
      <AttendanceSummary />
      <LeaveHistoryTable />

      {/* 휴가 신청 — 결재 기안작성모달 재사용.
          initialType 으로 '연차신청서' 양식을 자동 선택한다.
          상신/임시저장 완료 시 refresh() 로 연차 요약·내역을 다시 로드. */}
      <ApprovalWriteModal
        isOpen={writeModalOpen}
        onClose={closeLeaveWrite}
        onComplete={refresh}
        initialType={LEAVE_FORM_TYPE}
      />

      {/* 휴가 내역 상세 — 결재 상세모달 재사용.
          docId 가 있을 때만 열린다. 승인/반려 등 처리 후 refresh(). */}
      <ApprovalViewModal
        docId={viewModalDocId}
        isOpen={viewModalDocId != null}
        onClose={closeLeaveDetail}
        onComplete={refresh}
      />
    </section>
  );
}