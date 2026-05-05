import { NavLink } from 'react-router-dom';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { sidebarLinks } from '../utils/constants';
import { classNames } from '../utils/formatters';

export default function Sidebar() {
  return (
    <aside className="hidden h-full min-h-screen border-r border-line/90 bg-sidebar px-6 py-8 lg:flex lg:flex-col">
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-hero shadow-panel">
          <span className="h-[18px] w-[18px] rounded-full bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.2)]" />
        </div>
        <div>
          <p className="text-lg font-extrabold text-ink">FinanceFlow</p>
          <p className="text-sm text-muted">SEPM Project UI</p>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        {sidebarLinks.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              classNames(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition',
                isActive
                  ? 'bg-[linear-gradient(167deg,rgba(47,111,237,0.14),rgba(15,143,140,0.14))] text-ink'
                  : 'text-slate-600 hover:bg-white hover:text-ink',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-[24px] bg-white p-5 shadow-panel">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">March target</p>
        <h3 className="mt-3 text-lg font-bold text-ink">Save INR 30,000</h3>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-positive to-[#19A96E]" />
        </div>
        <p className="mt-3 text-sm text-muted">INR 23,400 saved so far</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-panel px-3 py-2 text-xs font-semibold text-slate-600">
          <ArrowDownTrayIcon className="h-4 w-4" />
          Budget health looks strong
        </div>
      </div>
    </aside>
  );
}
