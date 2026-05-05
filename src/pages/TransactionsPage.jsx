import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/AppLayout';
import TopHeader from '../components/TopHeader';
import TransactionsTable from '../components/TransactionsTable';
import AddTransactionModal from '../components/AddTransactionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { categories } from '../utils/constants';
import { downloadTransactionsCsv } from '../utils/formatters';
import transactionService from '../services/transactionService';
import { useDebounce } from '../hooks/useDebounce';
import { useModal } from '../hooks/useModal';

export default function TransactionsPage() {
  const transactionModal = useModal();
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    type: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 8,
  });
  const debouncedSearch = useDebounce(filters.search);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const requestParams = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch],
  );

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await transactionService.getTransactions(requestParams);
      setTransactions(response.transactions);
      setPagination(response.pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to fetch transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [requestParams]);

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? value : 1,
    }));
  };

  const handleSubmit = async (payload) => {
    if (editingTransaction) {
      await transactionService.updateTransaction(editingTransaction._id, payload);
    } else {
      await transactionService.createTransaction(payload);
    }

    setEditingTransaction(null);
    await fetchTransactions();
  };

  const handleDelete = async (transaction) => {
    const confirmed = window.confirm(`Delete "${transaction.title}"?`);
    if (!confirmed) {
      return;
    }

    await transactionService.deleteTransaction(transaction._id);
    await fetchTransactions();
  };

  return (
    <AppLayout>
      <TopHeader
        eyebrow="Ledger"
        title="All Transactions"
        searchValue={filters.search}
        onSearchChange={(value) => handleFilterChange('search', value)}
        searchPlaceholder="Search merchant or category"
        actions={
          <div className="flex gap-3">
            <button className="secondary-button" onClick={() => downloadTransactionsCsv(transactions)}>
              Export CSV
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setEditingTransaction(null);
                transactionModal.open();
              }}
            >
              Add Transaction
            </button>
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <select className="input-field max-w-[220px]" value={filters.category} onChange={(event) => handleFilterChange('category', event.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select className="input-field max-w-[220px]" value={filters.type} onChange={(event) => handleFilterChange('type', event.target.value)}>
          <option value="">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <input className="input-field max-w-[200px]" type="date" value={filters.startDate} onChange={(event) => handleFilterChange('startDate', event.target.value)} />
        <input className="input-field max-w-[200px]" type="date" value={filters.endDate} onChange={(event) => handleFilterChange('endDate', event.target.value)} />
      </div>

      <div className="panel-card mt-5 p-6">
        {loading ? (
          <LoadingSpinner label="Loading transactions..." />
        ) : error ? (
          <EmptyState title="Transactions unavailable" description={error} action={<button className="primary-button" onClick={fetchTransactions}>Retry</button>} />
        ) : transactions.length ? (
          <>
            <TransactionsTable
              transactions={transactions}
              showActions
              onEdit={(transaction) => {
                setEditingTransaction(transaction);
                transactionModal.open();
              }}
              onDelete={handleDelete}
            />

            <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} transactions)
              </p>
              <div className="flex gap-3">
                <button
                  className="ghost-button"
                  disabled={pagination.page <= 1}
                  onClick={() => handleFilterChange('page', pagination.page - 1)}
                >
                  Previous
                </button>
                <button
                  className="secondary-button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => handleFilterChange('page', pagination.page + 1)}
                >
                  Load More
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No transactions yet"
            description="Use the Add Transaction button to log your first income or expense."
            action={
              <button
                className="primary-button"
                onClick={() => {
                  setEditingTransaction(null);
                  transactionModal.open();
                }}
              >
                Add Transaction
              </button>
            }
          />
        )}
      </div>

      <AddTransactionModal
        open={transactionModal.isOpen}
        onClose={() => {
          setEditingTransaction(null);
          transactionModal.close();
        }}
        onSubmit={handleSubmit}
        defaultType={editingTransaction?.type || 'expense'}
        initialValues={editingTransaction}
      />
    </AppLayout>
  );
}
