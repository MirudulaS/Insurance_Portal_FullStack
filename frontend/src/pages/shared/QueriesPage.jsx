import { useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useLiveRefresh } from '../../hooks/useAsync';
import queryService from '../../services/queryService';
import preAuthorizationService from '../../services/preAuthorizationService';
import { scopeFilters } from '../../utils/scope';
import { formatDateTime } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function QueriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requests } = useAsync(() => preAuthorizationService.getAll(scopeFilters(user)), [user?.id]);
  const requestIds = (requests || []).map((r) => r.id);

  const { data: allQueries, loading, error, refetch } = useAsync(() => queryService.getAll(), []);
  const queries = (allQueries || []).filter((q) => requestIds.includes(q.preAuthorizationId));

  useLiveRefresh(['query:new', 'query:updated'], refetch);

  const columns = [
    { key: 'id', header: 'Query ID', render: (q) => <span className="font-mono-ids text-xs font-medium text-primary">{q.id}</span> },
    { key: 'preAuthorizationId', header: 'Request', render: (q) => <span className="font-mono-ids text-xs text-muted">{q.preAuthorizationId}</span> },
    { key: 'question', header: 'Question', render: (q) => <span className="line-clamp-1">{q.question}</span> },
    { key: 'raisedBy', header: 'Raised by' },
    { key: 'raisedDate', header: 'Raised', render: (q) => formatDateTime(q.raisedDate) },
    { key: 'status', header: 'Status', render: (q) => <StatusBadge status={q.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Queries" description="Clarifications raised on pre-authorization requests." />
      {loading && <LoadingState label="Loading queries…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}
      {!loading && !error && queries.length === 0 && (
        <EmptyState icon={MessageSquareText} title="No queries found." message="Queries will appear here once raised." />
      )}
      {!loading && !error && queries.length > 0 && (
        <DataTable
          columns={columns}
          rows={queries}
          onRowClick={(q) => navigate(`/${user.role.toLowerCase()}/preauthorizations/${q.preAuthorizationId}`)}
        />
      )}
    </div>
  );
}
