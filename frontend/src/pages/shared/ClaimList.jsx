import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLiveRefresh } from '../../hooks/useAsync';
import claimService from '../../services/claimService';
import patientService from '../../services/patientService';
import { scopeFilters } from '../../utils/scope';
import { CLAIM_STATUS } from '../../config';
import { formatCurrency, formatDate } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import FilterBar from '../../components/common/FilterBar';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function ClaimList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');

  const filters = { ...scopeFilters(user), status };
  const { data: claims, loading, error, refetch } = useAsync(() => claimService.getAll(filters), [status, user?.id]);
  const { data: patients } = useAsync(() => patientService.getAll(), []);

  useLiveRefresh('claim:statusChanged', refetch);

  const patientMap = Object.fromEntries((patients || []).map((p) => [p.id, p]));
  const basePath = `/${user.role.toLowerCase()}/claims`;

  const columns = [
    { key: 'id', header: 'Claim ID', render: (c) => <span className="font-mono-ids text-xs font-medium text-primary">{c.id}</span> },
    { key: 'preAuthorizationId', header: 'Request ID', render: (c) => <span className="font-mono-ids text-xs text-muted">{c.preAuthorizationId}</span> },
    { key: 'patient', header: 'Patient', render: (c) => patientMap[c.patientId]?.name || c.patientId },
    { key: 'claimedAmount', header: 'Claimed', render: (c) => formatCurrency(c.claimedAmount) },
    { key: 'settlementAmount', header: 'Settled', render: (c) => formatCurrency(c.settlementAmount) },
    { key: 'claimDate', header: 'Claim date', render: (c) => formatDate(c.claimDate) },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Claims" description="Track claims from submission through settlement." />

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: 'status',
              label: 'All statuses',
              value: status,
              onChange: setStatus,
              options: Object.values(CLAIM_STATUS).map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
            },
          ]}
        />
      </div>

      {loading && <LoadingState label="Loading claims…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}
      {!loading && !error && claims?.length === 0 && (
        <EmptyState icon={Receipt} title="No claims found." message="Claims appear once a pre-authorization is approved." />
      )}
      {!loading && !error && claims?.length > 0 && (
        <DataTable columns={columns} rows={claims} onRowClick={(c) => navigate(`${basePath}/${c.id}`)} />
      )}
    </div>
  );
}
