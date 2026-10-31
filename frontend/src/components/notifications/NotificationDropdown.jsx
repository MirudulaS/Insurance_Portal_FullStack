import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import NotificationItem from './NotificationItem';
import EmptyState from '../common/EmptyState';

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleClick = async (notif) => {
    if (!notif.isRead) await markAsRead(notif.id);
    setOpen(false);
    navigate(`/${user.role.toLowerCase()}/notifications`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-background hover:text-ink"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-card border border-border bg-surface shadow-pop">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-display text-sm font-semibold text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No notifications" message="You're all caught up." />
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => <NotificationItem key={n.id} notification={n} onClick={handleClick} />)
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate(`/${user.role.toLowerCase()}/notifications`);
            }}
            className="block w-full border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-background"
          >
            View all
          </button>
        </div>
      )}
    </div>
  );
}
