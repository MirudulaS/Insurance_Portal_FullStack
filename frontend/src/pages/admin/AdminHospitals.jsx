import { Building2 } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import organizationService from '../../services/organizationService';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';

export default function AdminHospitals() {
  const { data: hospitals, loading } = useAsync(() => organizationService.getHospitals(), []);

  const columns = [
    { key: 'id', header: 'Hospital ID', render: (h) => <span className="font-mono-ids text-xs font-medium text-primary">{h.id}</span> },
    { key: 'name', header: 'Name' },
    { key: 'city', header: 'City' },
    { key: 'registrationNo', header: 'Registration no.' },
    { key: 'contactPhone', header: 'Phone' },
  ];

  return (
    <div>
      <PageHeader title="Hospitals" description="Hospitals registered on the platform." />
      {loading && <LoadingState label="Loading hospitals…" />}
      {!loading && hospitals.length === 0 && <EmptyState icon={Building2} title="No hospitals found." />}
      {!loading && hospitals.length > 0 && <DataTable columns={columns} rows={hospitals} />}
    </div>
  );
}
