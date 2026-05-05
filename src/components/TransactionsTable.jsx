import {
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { categoryColors } from '../utils/constants';
import { formatCurrency, formatDate, getTransactionStatus } from '../utils/formatters';

function StatusPill({ type }) {
  const label = getTransactionStatus(type);
  const tone =
    type === 'income'
      ? 'bg-accentSoft text-accent'
      : 'bg-positiveSoft text-positive';

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${tone}`}>{label}</span>;
}

export default function TransactionsTable({
  transactions,
  showActions = false,
  onEdit,
  onDelete,
  compact = false,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="pb-4 text-left text-xs font-extrabold text-slate-500">Title</th>
            <th className="pb-4 text-left text-xs font-extrabold text-slate-500">Category</th>
            <th className="pb-4 text-left text-xs font-extrabold text-slate-500">Status</th>
            <th className="pb-4 text-left text-xs font-extrabold text-slate-500">Date</th>
            <th className="pb-4 text-left text-xs font-extrabold text-slate-500">Amount</th>
            {showActions && <th className="pb-4 text-right text-xs font-extrabold text-slate-500">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction._id} className="border-t border-slate-100">
              <td className="py-4 text-sm font-bold text-ink">{transaction.title}</td>
              <td className="py-4 text-sm font-bold text-ink">
                <div className="flex items-center gap-2">
                  {!compact && (
                    <span
                      className="h-3.5 w-3.5 rounded-[5px]"
                      style={{ backgroundColor: categoryColors[transaction.category] || '#0F8F8C' }}
                    />
                  )}
                  {transaction.category}
                </div>
              </td>
              <td className="py-4">
                <StatusPill type={transaction.type} />
              </td>
              <td className="py-4 text-sm font-bold text-ink">{formatDate(transaction.date)}</td>
              <td className={`py-4 text-sm font-extrabold ${transaction.type === 'income' ? 'text-positive' : 'text-negative'}`}>
                {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
              </td>
              {showActions && (
                <td className="py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-xl border border-line p-2 text-slate-500 transition hover:border-brand hover:text-brand"
                      onClick={() => onEdit(transaction)}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-xl border border-line p-2 text-slate-500 transition hover:border-negative hover:text-negative"
                      onClick={() => onDelete(transaction)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
