import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import userService from '../../services/userService';
import PageHeader from '../../components/common/PageHeader';
import FilterBar from '../../components/common/FilterBar';
import AuditTimeline from '../../components/common/AuditTimeline';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';

export default function AdminAuditLogs() {
  const [entityType, setEntityType] = useState('');
  const { data: logs, loading } = useAsync(() => userService.getAuditLogs({ entityType }), [entityType]);

  return (
    <div>
      <PageHeader title="Audit Logs" description="A full history of actions taken across the platform." />
      <div className="mb-4">
        <FilterBar
          filters={[
            {
              key: 'entityType',
              label: 'All types',
              value: entityType,
              onChange: setEntityType,
              options: [
                { value: 'PREAUTHORIZATION', label: 'Pre-Authorization' },
                { value: 'CLAIM', label: 'Claim' },
              ],
            },
          ]}
        />
      </div>
      {loading && <LoadingState label="Loading audit logs…" />}
      {!loading && logs.length === 0 && <EmptyState icon={ScrollText} title="No audit entries found." />}
      {!loading && logs.length > 0 && <AuditTimeline logs={logs} />}
    </div>
  );
}
