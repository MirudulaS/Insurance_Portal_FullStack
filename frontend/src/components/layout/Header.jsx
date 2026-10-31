import { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { initials } from '../../utils/format';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <button onClick={onMenuClick} className="rounded-md p-2 text-muted hover:bg-background hover:text-ink lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <NotificationDropdown />

        <div className="relative" ref={ref}>
          <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: user?.avatarColor || '#1F4E5F' }}
            >
              {initials(user?.name)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-ink">{user?.name}</p>
              <p className="text-xs leading-tight text-muted">{user?.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-card border border-border bg-surface shadow-pop">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/${user.role.toLowerCase()}/profile`);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-background"
              >
                <UserCircle className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-error hover:bg-background"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
