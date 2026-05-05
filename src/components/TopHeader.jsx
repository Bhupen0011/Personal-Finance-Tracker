import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

export default function TopHeader({
  eyebrow,
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search transactions, budgets, merchants',
  actions,
}) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {typeof onSearchChange === 'function' && (
          <label className="flex items-center gap-3 rounded-[18px] border border-line bg-white px-4 py-3 text-sm text-muted shadow-panel md:min-w-[320px]">
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full border-none bg-transparent p-0 text-sm text-ink outline-none placeholder:text-slate-400"
            />
          </label>
        )}

        <button className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-line bg-white text-slate-500 shadow-panel md:flex">
          <BellIcon className="h-5 w-5" />
        </button>

        {actions}

        <div className="hidden rounded-[18px] bg-white p-2 pr-4 shadow-panel md:flex md:items-center md:gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[linear-gradient(135deg,rgba(47,111,237,0.16),rgba(15,143,140,0.16))] text-sm font-extrabold text-slate-700">
            {(user?.name || 'NS')
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div>
            <p className="text-sm font-bold text-ink">{user?.name || 'Finance User'}</p>
            <p className="text-xs text-muted">{user?.email || 'Personal account'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
