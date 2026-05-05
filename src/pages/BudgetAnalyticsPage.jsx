import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AppLayout from '../components/AppLayout';
import TopHeader from '../components/TopHeader';
import SummaryCards from '../components/SummaryCards';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import budgetService from '../services/budgetService';
import dashboardService from '../services/dashboardService';
import { categories } from '../utils/constants';
import { formatCurrency, getMonthLabel } from '../utils/formatters';

export default function BudgetAnalyticsPage() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [budgetDraft, setBudgetDraft] = useState({
    category: 'Food',
    monthlyLimit: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const [summaryResponse, analyticsResponse, budgetsResponse] = await Promise.all([
        dashboardService.getSummary({ month, year }),
        dashboardService.getAnalytics({ month, year }),
        budgetService.getBudgets({ month, year }),
      ]);

      setSummary(summaryResponse);
      setAnalytics(analyticsResponse);
      setBudgets(budgetsResponse.budgets);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to fetch budget analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const handleBudgetSave = async (event) => {
    event.preventDefault();
    await budgetService.createBudget({
      category: budgetDraft.category,
      monthlyLimit: Number(budgetDraft.monthlyLimit),
      month,
      year,
    });
    setBudgetDraft({ category: budgetDraft.category, monthlyLimit: '' });
    setBudgetModalOpen(false);
    await fetchData();
  };

  const summaryCards = useMemo(() => {
    const totalBudget = summary?.budgetHighlights?.totalBudget || 0;
    const spent = summary?.budgetHighlights?.spent || 0;
    const remaining = summary?.budgetHighlights?.remaining || 0;
    const goal = analytics?.savingsGoal;

    return [
      { label: 'Total Budget', value: totalBudget, helper: `${budgets.length} categories tracked` },
      { label: 'Spent', value: spent, helper: `${summary?.budgetHighlights?.percentUsed?.toFixed(1) || 0}% of monthly limit`, negative: true },
      { label: 'Remaining', value: remaining, helper: 'Available to allocate', positive: true },
      { label: 'Savings Goal', value: goal?.target || 150000, helper: `${formatCurrency(goal?.current || 0)} saved` },
    ];
  }, [summary, analytics, budgets.length]);

  const overspendingAlerts = analytics?.overspendingAlerts || [];
  const goalPercent = analytics?.savingsGoal?.percentage || 0;

  return (
    <AppLayout>
      <TopHeader
        eyebrow="Planning"
        title="Budget Analytics"
        actions={
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-panel px-3 py-2 text-xs font-bold text-slate-700">{getMonthLabel(month, year)}</div>
            <button className="primary-button" onClick={() => setBudgetModalOpen(true)}>
              Adjust Budgets
            </button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading budget analytics..." />
      ) : error ? (
        <EmptyState title="Budget analytics unavailable" description={error} action={<button className="primary-button" onClick={fetchData}>Retry</button>} />
      ) : (
        <>
          <SummaryCards items={summaryCards} />

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <div className="panel-card p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-ink">Category Progress</h3>
                <p className="text-sm text-muted">Current spend against planned budget</p>
              </div>
              <div className="space-y-5">
                {(summary?.budgetProgress || []).map((item) => {
                  const width = Math.min(item.percentUsed, 100);
                  const tone = item.percentUsed >= 100 ? 'from-[#F97373] to-negative' : item.percentUsed >= 90 ? 'from-brand to-accent' : 'from-positive to-[#19A96E]';

                  return (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm font-bold text-ink">
                        <span>{item.category}</span>
                        <span>
                          {formatCurrency(item.spent)} / {formatCurrency(item.monthlyLimit)}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}

                {!summary?.budgetProgress?.length && (
                  <p className="text-sm text-muted">No category budgets set. Use Adjust Budgets to add your first limit.</p>
                )}
              </div>
            </div>

            <div className="panel-card p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-ink">Monthly Comparison</h3>
                <p className="text-sm text-muted">Actual vs planned budget</p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.monthlyOverview || []} barGap={8}>
                    <CartesianGrid vertical={false} stroke="#EDF2F7" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="budget" fill="#DBE7FD" radius={[12, 12, 6, 6]} />
                    <Bar dataKey="expense" fill="#0F8F8C" radius={[12, 12, 6, 6]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-6 xl:col-span-2">
              <h3 className="text-xl font-bold text-ink">Overspending Alert</h3>
              <p className="mt-2 text-sm text-muted">
                {overspendingAlerts.length
                  ? overspendingAlerts.map((alert) => `${alert.category} is at ${alert.percentUsed.toFixed(0)}% of budget`).join(' and ')
                  : 'No overspending detected. Your current budget mix looks healthy.'}
              </p>
            </div>

            <div className="panel-card p-6 xl:col-span-2">
              <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                <div className="mx-auto grid h-[210px] w-[210px] place-items-center rounded-full" style={{ background: `conic-gradient(#0F8F8C ${goalPercent}%, #E7EEF6 0)` }}>
                  <div className="grid h-[158px] w-[158px] place-items-center rounded-full bg-white text-center">
                    <div>
                      <p className="text-3xl font-bold text-ink">{goalPercent.toFixed(0)}%</p>
                      <p className="text-sm text-muted">Completed</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-ink">Savings Goal Tracker</h3>
                  <p className="mt-2 text-sm text-muted">Laptop + emergency fund target</p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[22px] bg-panel p-5">
                      <p className="text-sm font-bold text-muted">Saved</p>
                      <p className="mt-2 text-3xl font-bold text-ink">{formatCurrency(analytics?.savingsGoal?.current || 0)}</p>
                    </div>
                    <div className="rounded-[22px] bg-panel p-5">
                      <p className="text-sm font-bold text-muted">Goal</p>
                      <p className="mt-2 text-3xl font-bold text-ink">{formatCurrency(analytics?.savingsGoal?.target || 150000)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm">
          <form className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-[0_38px_80px_rgba(15,23,42,0.2)]" onSubmit={handleBudgetSave}>
            <h3 className="text-2xl font-bold text-ink">Adjust Budget</h3>
            <p className="mt-2 text-sm text-muted">Set or update a monthly limit for the selected month.</p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-ink">Category</span>
                <select className="input-field" value={budgetDraft.category} onChange={(event) => setBudgetDraft((current) => ({ ...current, category: event.target.value }))}>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-ink">Monthly limit</span>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  value={budgetDraft.monthlyLimit}
                  onChange={(event) => setBudgetDraft((current) => ({ ...current, monthlyLimit: event.target.value }))}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-ink">Month</span>
                  <input className="input-field" type="number" value={month} min="1" max="12" onChange={(event) => setMonth(Number(event.target.value))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-ink">Year</span>
                  <input className="input-field" type="number" value={year} min="2024" max="2100" onChange={(event) => setYear(Number(event.target.value))} />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="ghost-button" onClick={() => setBudgetModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Save Budget
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
