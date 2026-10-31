import { statusLabel } from '../../utils/format';

const STATUS_COLORS = {
  // Pre-authorization statuses
  DRAFT: 'muted',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  QUERY_RAISED: 'warning',
  RESUBMITTED: 'info',
  APPROVED: 'success',
  PARTIALLY_APPROVED: 'warning',
  REJECTED: 'error',
  // Claim statuses
  CLAIM_SUBMITTED: 'info',
  UNDER_VERIFICATION: 'info',
  SETTLEMENT_PROCESSED: 'success',
  SETTLED: 'success',
  // Query statuses
  OPEN: 'warning',
  RESPONDED: 'info',
  RESOLVED: 'success',
};

const COLOR_CLASSES = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted/10 text-muted',
};

export default function StatusBadge({ status, className = '' }) {
  const tone = STATUS_COLORS[status] || 'muted';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${COLOR_CLASSES[tone]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}
