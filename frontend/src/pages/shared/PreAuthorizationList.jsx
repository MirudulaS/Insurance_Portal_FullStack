import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLiveRefresh } from '../../hooks/useAsync';
import preAuthorizationService from '../../services/preAuthorizationService';
import patientService from '../../services/patientService';
import { scopeFilters } from '../../utils/scope';
import { PREAUTH_STATUS, ROLES } from '../../config';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import FilterBar from '../../components/common/FilterBar';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/format';

export default function PreAuthorizationList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const filters = { ...scopeFilters(user), search, status };
  const { data: requests, loading, error, refetch } = useAsync(() => preAuthorizationService.getAll(filters), [search, status, user?.id]);
  const { data: patients } = useAsync(() => patientService.getAll(), []);

  useLiveRefresh('preauthorization:statusChanged', refetch);

  const patientMap = useMemo(() => Object.fromEntries((patients || []).map((p) => [p.id, p])), [patients]);

  const basePath = `/${user.role.toLowerCase()}/preauthorizations`;

  const columns = [
    { key: 'id', header: 'Request ID', render: (r) => <span className="font-mono-ids text-xs font-medium text-primary">{r.id}</span> },
    { key: 'patient', header: 'Patient', render: (r) => patientMap[r.patientId]?.name || r.patientId },
    { key: 'treatment', header: 'Treatment', render: (r) => <span className="line-clamp-1">{r.treatment}</span> },
    { key: 'estimatedCost', header: 'Est. cost', render: (r) => formatCurrency(r.estimatedCost) },
    { key: 'admissionDate', header: 'Admission', render: (r) => formatDate(r.admissionDate) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Pre-Authorizations"
        description="Track requests from draft through approval and settlement."
        actions={
          user.role === ROLES.HOSPITAL && (
            <button
              onClick={() => navigate(`${basePath}/new`)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              New request
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by ID or diagnosis…" className="sm:max-w-xs" />
        <FilterBar
          filters={[
            {
              key: 'status',
              label: 'All statuses',
              value: status,
              onChange: setStatus,
              options: Object.values(PREAUTH_STATUS).map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
            },
          ]}
        />
      </div>

      {loading && <LoadingState label="Loading requests…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}
      {!loading && !error && requests?.length === 0 && (
        <EmptyState icon={FileText} title="No pre-authorization requests found." message="Try adjusting your filters." />
      )}
      {!loading && !error && requests?.length > 0 && (
        <DataTable columns={columns} rows={requests} onRowClick={(r) => navigate(`${basePath}/${r.id}`)} />
      )}
    </div>
  );
}
