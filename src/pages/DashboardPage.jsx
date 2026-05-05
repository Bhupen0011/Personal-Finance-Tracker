import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import TopHeader from '../components/TopHeader';
import SummaryCards from '../components/SummaryCards';
import LineChartCard from '../components/LineChartCard';
import CategoryPieChartCard from '../components/CategoryPieChartCard';
import QuickActionsCard from '../components/QuickActionsCard';
import TransactionsTable from '../components/TransactionsTable';
import AddTransactionModal from '../components/AddTransactionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import dashboardService from '../services/dashboardService';
import transactionService from '../services/transactionService';
import { downloadTransactionsCsv, formatCurrency } from '../utils/formatters';
import { useModal } from '../hooks/useModal';
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const transactionModal = useModal();
  const [modalType, setModalType] = useState('expense');
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = useMemo(() => new Date(), []);
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const [summaryResponse, analyticsResponse] = await Promise.all([
        dashboardService.getSummary({ month, year }),
        dashboardService.getAnalytics({ month, year }),
      ]);

      setSummary(summaryResponse);
      setAnalytics(analyticsResponse);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load the dashboard right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const summaryCards = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      { label: 'Total Balance', value: summary.totals.balance, helper: `${summary.totals.balanceDelta.toFixed(1)}% vs last month`, positive: true },
      { label: 'Total Income', value: summary.totals.income, helper: 'Freelance + stipend', positive: true },
      { label: 'Total Expenses', value: summary.totals.expense, helper: 'Tracked for the selected month', negative: true },
      { label: 'Savings', value: summary.totals.savings, helper: `${summary.totals.savingsRate.toFixed(1)}% savings rate`, positive: summary.totals.savings >= 0, negative: summary.totals.savings < 0 },
    ];
  }, [summary]);

  const filteredTransactions = useMemo(() => {
    const transactions = summary?.recentTransactions || [];
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return transactions;
    }

    return transactions.filter((transaction) =>
      [transaction.title, transaction.category, transaction.type].some((value) =>
        value.toLowerCase().includes(searchTerm),
      ),
    );
  }, [search, summary]);

  const handleCreateTransaction = async (payload) => {
    await transactionService.createTransaction(payload);
    await fetchDashboard();
  };

  const openAddModal = (type) => {
    setModalType(type);
    transactionModal.open();
  };

  const handleExport = () => {
    downloadTransactionsCsv(summary?.recentTransactions || [], 'dashboard-report.csv');
  };

  return (
    <AppLayout>
      <TopHeader eyebrow="Overview" title={`Good afternoon, ${user?.name?.split(' ')[0] || 'there'}`} searchValue={search} onSearchChange={setSearch} />

      {loading ? (
        <LoadingSpinner label="Loading dashboard analytics..." />
      ) : error ? (
        <EmptyState title="Dashboard unavailable" description={error} action={<button className="primary-button" onClick={fetchDashboard}>Retry</button>} />
      ) : (
        <>
          <div className="mt-6 rounded-[28px] bg-balance p-6 text-white shadow-soft lg:hidden">
            <p className="text-sm font-semibold text-white/80">Total Balance</p>
            <h2 className="mt-3 text-4xl font-bold">{formatCurrency(summary?.totals.balance || 0)}</h2>
            <p className="mt-2 text-sm text-white/80">Savings rate {summary?.totals.savingsRate.toFixed(1)}%</p>
          </div>

          <div className="mt-4 grid gap-3 lg:hidden sm:grid-cols-2">
            <div className="panel-card p-5">
              <p className="text-sm font-bold text-muted">Income</p>
              <p className="mt-2 text-3xl font-bold text-ink">{formatCurrency(summary?.totals.income || 0)}</p>
            </div>
            <div className="panel-card p-5">
              <p className="text-sm font-bold text-muted">Expense</p>
              <p className="mt-2 text-3xl font-bold text-ink">{formatCurrency(summary?.totals.expense || 0)}</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <SummaryCards items={summaryCards} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
            <LineChartCard
              title="Monthly Spending"
              subtitle="Trend across the last six months"
              data={analytics?.monthlyOverview}
            />

            <CategoryPieChartCard
              title="Category Split"
              subtitle="Top expense groups this month"
              data={analytics?.categoryBreakdown}
            />

            <div className="xl:col-start-2 xl:row-start-2">
              <QuickActionsCard
                budgetSummary={summary?.budgetHighlights}
                onAddExpense={() => openAddModal('expense')}
                onAddIncome={() => openAddModal('income')}
                onExport={handleExport}
              />
            </div>

            <div className="panel-card p-6 xl:col-start-2 xl:row-start-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-ink">Group Balances</h3>
                  <p className="text-sm text-muted">Splitwise-style sharing summary</p>
                </div>
                <button className="secondary-button !py-2.5" onClick={() => navigate('/groups')}>
                  Open Groups
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-panel p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Net Balance</p>
                  <p className="mt-2 text-2xl font-bold text-ink">{formatCurrency(summary?.groupWidget?.netGroupBalance || 0)}</p>
                </div>
                <div className="rounded-2xl bg-panel p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Pending Settlements</p>
                  <p className="mt-2 text-2xl font-bold text-ink">{summary?.groupWidget?.pendingSettlementsCount || 0}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-line bg-panel p-4">
                <p className="text-sm font-bold text-ink">Latest Shared Expense</p>
                <p className="mt-1 text-sm text-muted">
                  {summary?.groupWidget?.latestSharedExpense
                    ? `${summary.groupWidget.latestSharedExpense.title} · ${summary.groupWidget.latestSharedExpense.groupName}`
                    : 'No shared activity yet'}
                </p>
              </div>
            </div>

            <div className="panel-card p-6 xl:col-start-1 xl:row-start-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-ink">Recent Transactions</h3>
                  <p className="text-sm text-muted">Latest synced entries</p>
                </div>
                <span className="rounded-full bg-panel px-3 py-2 text-xs font-bold text-slate-700">
                  {filteredTransactions.length} items
                </span>
              </div>

              {filteredTransactions.length ? (
                <TransactionsTable transactions={filteredTransactions.slice(0, 4)} compact />
              ) : (
                <p className="text-sm text-muted">No transactions match your current search.</p>
              )}
            </div>
          </div>
        </>
      )}

      <AddTransactionModal
        open={transactionModal.isOpen}
        onClose={transactionModal.close}
        onSubmit={handleCreateTransaction}
        defaultType={modalType}
      />
    </AppLayout>
  );
}
