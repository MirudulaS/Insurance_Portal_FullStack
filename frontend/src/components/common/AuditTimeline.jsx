import { formatDateTime } from '../../utils/format';

export default function AuditTimeline({ logs = [] }) {
  return (
    <ul className="divide-y divide-border rounded-card border border-border bg-surface">
      {logs.map((log) => (
        <li key={log.id} className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">{log.action.replace(/_/g, ' ')}</p>
            <span className="font-mono-ids text-xs text-muted">{log.entityId}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">{log.by} · {formatDateTime(log.at)}</p>
          {log.details && <p className="mt-1 text-sm text-ink/80">{log.details}</p>}
        </li>
      ))}
    </ul>
  );
}
