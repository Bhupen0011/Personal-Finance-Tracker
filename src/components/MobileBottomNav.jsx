import { NavLink } from 'react-router-dom';
import { sidebarLinks } from '../utils/constants';
import { classNames } from '../utils/formatters';

export default function MobileBottomNav() {
  const mobileLabels = {
    Dashboard: 'Home',
    Transactions: 'Ledger',
    Groups: 'Groups',
    Settlements: 'Settle',
    'Profile / Settings': 'Profile',
  };
  const mobileLinks = sidebarLinks.filter((item) =>
    ['Dashboard', 'Transactions', 'Groups', 'Settlements', 'Profile / Settings'].includes(item.label),
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md gap-2" style={{ gridTemplateColumns: `repeat(${mobileLinks.length}, minmax(0, 1fr))` }}>
        {mobileLinks.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              classNames(
                'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-extrabold transition',
                isActive ? 'text-accent' : 'text-slate-500',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {mobileLabels[label]}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
