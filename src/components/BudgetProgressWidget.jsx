import { formatCurrency } from '../utils/formatters';

export default function BudgetProgressWidget({ spent = 0, totalBudget = 0, percentUsed = 0 }) {
  const cappedValue = Math.min(percentUsed, 100);

  return (
    <div className="rounded-[22px] bg-panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-ink">Budget Progress</span>
        <span className="font-bold text-ink">{percentUsed.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#F97373] to-negative"
          style={{ width: `${cappedValue}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        {formatCurrency(spent)} of {formatCurrency(totalBudget)} monthly budget used
      </p>
    </div>
  );
}
