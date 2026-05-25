import { fmtDate } from '../../config/approvalForms';

export default function ApproverProgress({ approvers, currentStep, docStatus }) {
  if (!approvers || approvers.length === 0) {
    return <p className="appr-progress-empty">결재선이 없습니다.</p>;
  }

  const isDone = ['approved', 'rejected', 'canceled'].includes(docStatus);

  return (
    <div className="appr-progress-line">
      {approvers.map((a, i) => {
        let cls = 'waiting';
        let icon = String(i + 1);

        if (a.status === 'approved') {
          cls = 'done';
          icon = '✓';
        } else if (a.status === 'rejected') {
          cls = 'rejected';
          icon = '✕';
        } else if (i === currentStep && !isDone) {
          cls = 'active';
          icon = '⟳';
        }

        return (
          <div key={a.id || i} className="appr-progress-step-wrap">
            <div className={`appr-progress-step ${cls}`}>
              <div className="appr-prog-circle">{icon}</div>
              <div className="appr-prog-label">{a.name}</div>
              <div className="appr-prog-sub">{a.dept}</div>
              {a.acted_at && (
                <div className="appr-prog-sub">{fmtDate(a.acted_at)}</div>
              )}
            </div>
            {i < approvers.length - 1 && <div className="appr-prog-connector" />}
          </div>
        );
      })}
    </div>
  );
}