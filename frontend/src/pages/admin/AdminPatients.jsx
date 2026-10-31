import { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import patientService from '../../services/patientService';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import CreatePatientLoginModal from '../../components/patients/CreatePatientLoginModal';

export default function AdminPatients() {
  const [search, setSearch] = useState('');
  const [loginFor, setLoginFor] = useState(null);
  const { data: patients, loading, refetch } = useAsync(() => patientService.getAll({ search }), [search]);

  const columns = [
    { key: 'id', header: 'Patient ID', render: (p) => <span className="font-mono-ids text-xs font-medium text-primary">{p.id}</span> },
    { key: 'name', header: 'Name' },
    { key: 'age', header: 'Age' },
    { key: 'policyNumber', header: 'Policy no.' },
    { key: 'primaryHospitalId', header: 'Hospital', render: (p) => <span className="font-mono-ids text-xs text-muted">{p.primaryHospitalId}</span> },
    { key: 'insurerId', header: 'Insurer', render: (p) => <span className="font-mono-ids text-xs text-muted">{p.insurerId}</span> },
    {
      key: 'login',
      header: 'Login',
      render: (p) =>
        p.hasLogin ? (
          <span className="text-xs font-medium text-success">Has own login</span>
        ) : (
          <button onClick={() => setLoginFor(p)} className="text-xs font-semibold text-primary hover:underline">
            Create login
          </button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Patients" description="All patients across every registered hospital." />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or policy number…" className="mb-4 sm:max-w-xs" />
      {loading && <LoadingState label="Loading patients…" />}
      {!loading && patients.length === 0 && <EmptyState icon={UserCircle} title="No patients found." />}
      {!loading && patients.length > 0 && <DataTable columns={columns} rows={patients} />}
      <CreatePatientLoginModal patient={loginFor} onClose={() => setLoginFor(null)} onCreated={refetch} />
    </div>
  );
}
