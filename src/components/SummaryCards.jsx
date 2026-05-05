import { formatCurrency } from '../utils/formatters';

export default function SummaryCards({ items }) {
  return (
    <div className="mt-7 grid gap-4 xl:grid-cols-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="panel-card p-5">
          <p className="text-sm font-bold text-muted">{item.label}</p>
          <h3 className="mt-2 text-[28px] font-bold tracking-tight text-ink">{formatCurrency(item.value)}</h3>
          <p className={`mt-2 text-sm ${item.positive ? 'text-positive' : item.negative ? 'text-negative' : 'text-muted'}`}>
            {item.helper}
          </p>
        </div>
      ))}
    </div>
  );
}
