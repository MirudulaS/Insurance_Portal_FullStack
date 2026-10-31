import { useNotifications } from '../../context/NotificationContext';
import { Bell } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import NotificationItem from '../../components/notifications/NotificationItem';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';

export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
        actions={
          unreadCount > 0 && (
            <button onClick={markAllAsRead} className="rounded-md border border-border px-3.5 py-2 text-sm font-medium text-primary hover:bg-background">
              Mark all as read
            </button>
          )
        }
      />

      {loading && <LoadingState label="Loading notifications…" />}
      {!loading && notifications.length === 0 && <EmptyState icon={Bell} title="No notifications yet." />}
      {!loading && notifications.length > 0 && (
        <div className="divide-y divide-border rounded-card border border-border bg-surface">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={(notif) => !notif.isRead && markAsRead(notif.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
