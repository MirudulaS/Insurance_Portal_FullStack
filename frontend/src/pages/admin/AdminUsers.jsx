import { useState } from 'react';
import { Users } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import userService from '../../services/userService';
import { ROLES } from '../../config';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import FilterBar from '../../components/common/FilterBar';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';

export default function AdminUsers() {
  const [role, setRole] = useState('');
  const { data: users, loading } = useAsync(() => userService.getAll({ role }), [role]);

  const columns = [
    { key: 'id', header: 'User ID', render: (u) => <span className="font-mono-ids text-xs font-medium text-primary">{u.id}</span> },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role' },
    { key: 'linkedId', header: 'Linked record', render: (u) => <span className="font-mono-ids text-xs text-muted">{u.linkedId || '—'}</span> },
    { key: 'createdAt', header: 'Joined', render: (u) => formatDate(u.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="Users" description="Everyone with access to the platform." />
      <div className="mb-4">
        <FilterBar
          filters={[
            { key: 'role', label: 'All roles', value: role, onChange: setRole, options: Object.values(ROLES).map((r) => ({ value: r, label: r })) },
          ]}
        />
      </div>
      {loading && <LoadingState label="Loading users…" />}
      {!loading && users.length === 0 && <EmptyState icon={Users} title="No users found." />}
      {!loading && users.length > 0 && <DataTable columns={columns} rows={users} />}
    </div>
  );
}
