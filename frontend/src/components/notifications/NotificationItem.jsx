import { Circle } from 'lucide-react';
import { timeAgo } from '../../utils/format';

export default function NotificationItem({ notification, onClick }) {
  return (
    <button
      onClick={() => onClick?.(notification)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-background ${
        !notification.isRead ? 'bg-info/5' : ''
      }`}
    >
      <Circle className={`mt-1.5 h-2 w-2 shrink-0 ${notification.isRead ? 'text-transparent' : 'fill-info text-info'}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{notification.title}</p>
        <p className="line-clamp-2 text-xs text-muted">{notification.message}</p>
        <p className="mt-0.5 text-[11px] text-muted">{timeAgo(notification.createdAt)}</p>
      </div>
    </button>
  );
}
