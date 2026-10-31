import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background">
        <Icon className="h-5 w-5 text-muted" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
