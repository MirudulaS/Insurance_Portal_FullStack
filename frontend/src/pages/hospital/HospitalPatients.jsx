import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import patientService from '../../services/patientService';
import { Users } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import CreatePatientLoginModal from '../../components/patients/CreatePatientLoginModal';

export default function HospitalPatients() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [loginFor, setLoginFor] = useState(null);
  const { data: patients, loading, error, refetch } = useAsync(
    () => patientService.getAll({ hospitalId: user.linkedId, search }),
    [search, user.linkedId]
  );

  const columns = [
    { key: 'id', header: 'Patient ID', render: (p) => <span className="font-mono-ids text-xs font-medium text-primary">{p.id}</span> },
    { key: 'name', header: 'Name' },
    { key: 'age', header: 'Age' },
    { key: 'gender', header: 'Gender' },
    { key: 'policyNumber', header: 'Policy no.' },
    { key: 'phone', header: 'Phone' },
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
      <PageHeader title="Patients" description="Patients registered under your hospital." />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or policy number…" className="mb-4 sm:max-w-xs" />

      {loading && <LoadingState label="Loading patients…" />}
      {!loading && error && <ErrorState message={error.message} onRetry={refetch} />}
      {!loading && !error && patients.length === 0 && <EmptyState icon={Users} title="No patients found." />}
      {!loading && !error && patients.length > 0 && <DataTable columns={columns} rows={patients} />}
      <CreatePatientLoginModal patient={loginFor} onClose={() => setLoginFor(null)} onCreated={refetch} />
    </div>
  );
}
