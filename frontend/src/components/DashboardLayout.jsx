import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { LogOut, Pill } from 'lucide-react';
import { auth } from '../firebase';
import { NAV_CONFIG } from './nav.config';

export default function DashboardLayout({ role }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-bg-base font-sans text-text-main">
      <aside className="fixed box-border flex h-screen w-[260px] flex-col justify-between border-r border-border bg-surface p-4">
        <div>
          <div className="mb-8 flex items-center gap-2.5 pl-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
              <Pill size={18} strokeWidth={2.25} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Dawa<span className="text-primary">Core</span>
            </span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_CONFIG[role].map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-light text-primary-dark font-semibold' : 'text-text-muted hover:bg-bg-base hover:text-text-main'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-border pt-4">
          <button
            onClick={() => signOut(auth)}
            className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-light"
          >
            <LogOut size={18} strokeWidth={2} />
            Secure Logout
          </button>
        </div>
      </aside>

      <main className="ml-[260px] box-border flex-grow p-10">
        <Outlet />
      </main>
    </div>
  );
}
