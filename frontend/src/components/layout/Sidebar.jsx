import { NavLink } from 'react-router-dom';
import { X, ShieldPlus } from 'lucide-react';
import { NAV_BY_ROLE } from '../../config/navigation';
import { APP_NAME } from '../../config';

export default function Sidebar({ role, open, onClose }) {
  const items = NAV_BY_ROLE[role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-primary-dark text-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <ShieldPlus className="h-5 w-5 text-accent" />
            </div>
            <span className="font-display text-sm font-semibold leading-tight">{APP_NAME}</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/70 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`h-5 w-1 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
          Pre-authorization &amp; claims
        </div>
      </aside>
    </>
  );
}
