import { useApproval, getStatusInfo } from '../../contexts/ApprovalContext';
import { SkeletonTable } from '../common/Skeleton';

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

// 양식 종류 → 짧은 라벨/아이콘
const TYPE_SHORT = {
  업무기안서: '업무',
  지출결의서: '지출',
  연차신청서: '연차',
  출장신청서: '출장',
  구매요청서: '구매',
  품의서: '품의',
};

export default function ApprovalTable({ onSelectDoc }) {
  const { filteredApprovals, loading } = useApproval();

  if (loading && filteredApprovals.length === 0) {
    return (
      <div style={{ padding: '8px 0' }}>
        <SkeletonTable rows={6} cols={7} />
      </div>
    );
  }

  if (filteredApprovals.length === 0) {
    return (
      <div className="appr-empty">
        <i className="fa-solid fa-folder-open"></i>
        <p className="appr-empty-title">문서가 없습니다</p>
        <p className="appr-empty-sub">기안 작성 버튼으로 새 문서를 상신하세요.</p>
      </div>
    );
  }

return (
  <table className="board-table appr-table" style={{ tableLayout: 'fixed', width: '100%' }}>
    <thead>
      <tr>
        <th style={{ width: '130px', textAlign: 'center' }}>문서번호</th>
        <th style={{ width: '80px', textAlign: 'center' }}>양식</th>
        <th style={{ textAlign: 'left' }}>제목</th>
        <th style={{ width: '100px' }}>기안자</th>
        <th style={{ width: '120px' }}>현재 결재자</th>
        <th style={{ width: '110px', textAlign: 'center' }}>기안일</th>
        <th style={{ width: '100px', textAlign: 'center' }}>상태</th>
      </tr>
      </thead>
      <tbody>
        {filteredApprovals.map((doc) => {
          const step = doc.current_step || 0;
          const total = doc.approvers?.length || 0;
          const statusInfo = getStatusInfo(doc.status, step, total);
          const currentApprover =
            doc.status === 'approved' || doc.status === 'rejected' || doc.status === 'canceled'
              ? '-'
              : doc.approvers?.[step]?.name || '-';

          return (
<tr key={doc.id} className="appr-row" onClick={() => onSelectDoc(doc.id)}>
          <td style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {doc.doc_number}
          </td>
              <td style={{ textAlign: 'center' }}>
                <span className="appr-type-chip">
                  {TYPE_SHORT[doc.type] || doc.type}
                </span>
              </td>
              <td className="appr-title-cell">
                {doc.urgency === '긴급' && <span className="urgency-dot">🔴</span>}
                {doc.urgency === '보통' && <span className="urgency-dot">🟡</span>}
                {doc.title}
              </td>
              <td>{doc.drafter_name || '-'}</td>
              <td>{currentApprover}</td>
              <td style={{ textAlign: 'center' }}>{fmtDate(doc.created_at)}</td>
              <td style={{ textAlign: 'center' }}>
                <span className={`status-badge ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}