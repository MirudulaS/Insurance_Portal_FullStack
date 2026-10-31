import { ShieldCheck } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import organizationService from '../../services/organizationService';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';

export default function AdminInsurers() {
  const { data: insurers, loading } = useAsync(() => organizationService.getInsurers(), []);

  const columns = [
    { key: 'id', header: 'Insurer ID', render: (i) => <span className="font-mono-ids text-xs font-medium text-primary">{i.id}</span> },
    { key: 'name', header: 'Name' },
    { key: 'ircdaCode', header: 'IRDA code' },
    { key: 'contactPhone', header: 'Phone' },
  ];

  return (
    <div>
      <PageHeader title="Insurers" description="Insurance companies registered on the platform." />
      {loading && <LoadingState label="Loading insurers…" />}
      {!loading && insurers.length === 0 && <EmptyState icon={ShieldCheck} title="No insurers found." />}
      {!loading && insurers.length > 0 && <DataTable columns={columns} rows={insurers} />}
    </div>
  );
}
