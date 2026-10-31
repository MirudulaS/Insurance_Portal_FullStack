import { useNavigate } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import documentService from '../../services/documentService';
import preAuthorizationService from '../../services/preAuthorizationService';
import { scopeFilters } from '../../utils/scope';
import { DOCUMENT_TYPE_LABELS } from '../../config';
import { formatFileSize } from '../../utils/fileValidation';
import { formatDateTime } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';

export default function DocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: requests } = useAsync(() => preAuthorizationService.getAll(scopeFilters(user)), [user?.id]);
  const requestIds = (requests || []).map((r) => r.id);

  const { data: allDocs, loading, error, refetch } = useAsync(() => documentService.getAll(), []);
  const documents = (allDocs || []).filter((d) => !d.preAuthorizationId || requestIds.includes(d.preAuthorizationId));

  const columns = [
    { key: 'fileName', header: 'File' },
    { key: 'type', header: 'Type', render: (d) => DOCUMENT_TYPE_LABELS[d.type] || d.type },
    { key: 'linked', header: 'Linked to', render: (d) => <span className="font-mono-ids text-xs text-muted">{d.preAuthorizationId || d.claimId}</span> },
    { key: 'fileSize', header: 'Size', render: (d) => formatFileSize(d.fileSize) },
    { key: 'uploadedAt', header: 'Uploaded', render: (d) => formatDateTime(d.uploadedAt) },
  ];

  return (
    <div>
      <PageHeader title="Documents" description="All documents linked to your pre-authorization requests and claims." />
      {loading && <LoadingState label="Loading documents…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}
      {!loading && !error && documents.length === 0 && (
        <EmptyState icon={FolderOpen} title="No documents found." message="Documents you upload will appear here." />
      )}
      {!loading && !error && documents.length > 0 && (
        <DataTable
          columns={columns}
          rows={documents}
          onRowClick={(d) =>
            d.preAuthorizationId && navigate(`/${user.role.toLowerCase()}/preauthorizations/${d.preAuthorizationId}`)
          }
        />
      )}
    </div>
  );
}
