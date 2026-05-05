import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/AppLayout';
import TopHeader from '../components/TopHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import groupService from '../services/groupService';
import { formatDate } from '../utils/formatters';

export default function SharedExpenseHistoryPage() {
  const [groups, setGroups] = useState([]);
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    groupId: '',
    status: '',
    splitType: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [groupsResponse, historyResponse] = await Promise.all([
        groupService.getGroups(),
        groupService.getSharedHistory(filters),
      ]);
      setGroups(groupsResponse.groups || []);
      setHistory(historyResponse.history || []);
      setPagination(historyResponse.pagination || { page: 1, pages: 1, total: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load shared history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const totals = useMemo(
    () => history.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [history],
  );

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? Number(value) : 1,
    }));
  };

  const exportCsv = async () => {
    try {
      const response = await groupService.exportSharedHistoryCsv();
      const blob = new Blob([response.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', response.filename || 'shared-history.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to export CSV');
    }
  };

  return (
    <AppLayout>
      <TopHeader
        eyebrow="Audit"
        title="Shared Expense History"
        searchValue={filters.search}
        onSearchChange={(value) => updateFilter('search', value)}
        searchPlaceholder="Search expense, payer, notes"
        actions={(
          <div className="flex gap-3">
            <button className="secondary-button" onClick={exportCsv}>
              Export CSV
            </button>
            <button className="primary-button" onClick={fetchData}>
              Refresh
            </button>
          </div>
        )}
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <select className="input-field max-w-[220px]" value={filters.groupId} onChange={(event) => updateFilter('groupId', event.target.value)}>
          <option value="">All groups</option>
          {groups.map((group) => (
            <option key={group._id} value={group._id}>
              {group.name}
            </option>
          ))}
        </select>
        <select className="input-field max-w-[220px]" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="partially_settled">Partially settled</option>
          <option value="settled">Settled</option>
        </select>
        <select className="input-field max-w-[220px]" value={filters.splitType} onChange={(event) => updateFilter('splitType', event.target.value)}>
          <option value="">All split types</option>
          <option value="equal">Equal</option>
          <option value="unequal">Unequal</option>
          <option value="percentage">Percentage</option>
          <option value="shares">Shares</option>
        </select>
        <input className="input-field max-w-[220px]" type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} />
        <input className="input-field max-w-[220px]" type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} />
      </div>

      <div className="panel-card mt-5 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-ink">History</h3>
          <span className="rounded-full bg-panel px-3 py-2 text-xs font-bold text-slate-700">
            {history.length} rows · total {totals.toLocaleString('en-IN')}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading shared history..." />
        ) : error ? (
          <EmptyState
            title="History unavailable"
            description={error}
            action={(
              <button className="primary-button" onClick={fetchData}>
                Retry
              </button>
            )}
          />
        ) : history.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted">
                    <th className="pb-3 pr-3">Expense</th>
                    <th className="pb-3 pr-3">Group</th>
                    <th className="pb-3 pr-3">Amount</th>
                    <th className="pb-3 pr-3">Paid By</th>
                    <th className="pb-3 pr-3">Split</th>
                    <th className="pb-3 pr-3">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item._id} className="border-t border-line">
                      <td className="py-3 pr-3">
                        <p className="font-bold text-ink">{item.title}</p>
                        <p className="text-xs text-muted">{item.category}</p>
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{item.groupName}</td>
                      <td className="py-3 pr-3 font-semibold text-ink">{item.currency} {item.amount}</td>
                      <td className="py-3 pr-3 text-slate-700">{item.paidBy?.name}</td>
                      <td className="py-3 pr-3 text-slate-700">{item.splitType}</td>
                      <td className="py-3 pr-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'settled' ? 'bg-positiveSoft text-positive' : item.status === 'partially_settled' ? 'bg-brandSoft text-brand' : 'bg-negativeSoft text-negative'}`}>
                          {item.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-slate-700">{formatDate(item.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-muted">
                Page {pagination.page} of {pagination.pages} ({pagination.total} records)
              </p>
              <div className="flex gap-3">
                <button className="ghost-button" disabled={pagination.page <= 1} onClick={() => updateFilter('page', pagination.page - 1)}>
                  Previous
                </button>
                <button className="secondary-button" disabled={pagination.page >= pagination.pages} onClick={() => updateFilter('page', pagination.page + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No shared expenses"
            description="Try changing the filters or add expenses from a group."
          />
        )}
      </div>
    </AppLayout>
  );
}
