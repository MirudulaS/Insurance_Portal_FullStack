import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, Receipt, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLiveRefresh } from '../../hooks/useAsync';
import preAuthorizationService from '../../services/preAuthorizationService';
import claimService from '../../services/claimService';
import { PREAUTH_STATUS, CLAIM_STATUS } from '../../config';
import { formatCurrency, formatDate } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requests, loading: reqLoading, refetch: refetchReq } = useAsync(
    () => preAuthorizationService.getAll({ patientId: user.linkedId }),
    [user.linkedId]
  );
  const { data: claims, loading: claimLoading, refetch: refetchClaims } = useAsync(
    () => claimService.getAll({ patientId: user.linkedId }),
    [user.linkedId]
  );

  useLiveRefresh(['preauthorization:statusChanged', 'claim:statusChanged'], () => {
    refetchReq();
    refetchClaims();
  });

  if (reqLoading || claimLoading) return <LoadingState label="Loading your dashboard…" />;

  const pending = requests.filter((r) =>
    [PREAUTH_STATUS.SUBMITTED, PREAUTH_STATUS.UNDER_REVIEW, PREAUTH_STATUS.QUERY_RAISED, PREAUTH_STATUS.RESUBMITTED].includes(r.status)
  );
  const approved = requests.filter((r) => [PREAUTH_STATUS.APPROVED, PREAUTH_STATUS.PARTIALLY_APPROVED].includes(r.status));
  const activeClaims = claims.filter((c) => c.status !== CLAIM_STATUS.SETTLED && c.status !== CLAIM_STATUS.REJECTED);
  const settledClaims = claims.filter((c) => c.status === CLAIM_STATUS.SETTLED);
  const mostRecent = requests[0];

  return (
    <div>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} description="Here's where your treatment and claims stand." />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Pending requests" value={pending.length} icon={Clock} onClick={() => navigate('/patient/preauthorizations')} />
        <StatCard label="Approved requests" value={approved.length} icon={CheckCircle2} onClick={() => navigate('/patient/preauthorizations')} />
        <StatCard label="Active claims" value={activeClaims.length} icon={Receipt} onClick={() => navigate('/patient/claims')} />
        <StatCard label="Settled claims" value={settledClaims.length} icon={BadgeCheck} onClick={() => navigate('/patient/claims')} />
        <StatCard label="Total requests" value={requests.length} icon={FileText} onClick={() => navigate('/patient/preauthorizations')} />
      </div>

      {mostRecent && (
        <div className="mb-6 rounded-card border border-border bg-surface p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-sm font-semibold text-ink">Most recent request</p>
            <StatusBadge status={mostRecent.status} />
          </div>
          <p className="text-sm text-ink">{mostRecent.treatment}</p>
          <p className="mt-1 text-xs text-muted">
            {mostRecent.id} · Admission {formatDate(mostRecent.admissionDate)} · Estimated {formatCurrency(mostRecent.estimatedCost)}
          </p>
          <button
            onClick={() => navigate(`/patient/preauthorizations/${mostRecent.id}`)}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            View details →
          </button>
        </div>
      )}

      <p className="mb-3 font-display text-sm font-semibold text-ink">Recent claims</p>
      {claims.length === 0 ? (
        <EmptyState title="No claims yet." message="Claims will appear once your hospital submits one." />
      ) : (
        <DataTable
          columns={[
            { key: 'id', header: 'Claim ID', render: (c) => <span className="font-mono-ids text-xs font-medium text-primary">{c.id}</span> },
            { key: 'claimedAmount', header: 'Claimed', render: (c) => formatCurrency(c.claimedAmount) },
            { key: 'settlementAmount', header: 'Settled', render: (c) => formatCurrency(c.settlementAmount) },
            { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
          ]}
          rows={claims.slice(0, 5)}
          onRowClick={(c) => navigate(`/patient/claims/${c.id}`)}
        />
      )}
    </div>
  );
}
