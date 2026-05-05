import BudgetProgressWidget from './BudgetProgressWidget';

export default function QuickActionsCard({ budgetSummary, onAddExpense, onAddIncome, onExport }) {
  return (
    <div className="panel-card p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-ink">Quick Actions</h3>
        <p className="text-sm text-muted">Common finance tasks</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <button className="primary-button" onClick={onAddExpense}>
          Add Expense
        </button>
        <button className="secondary-button" onClick={onAddIncome}>
          Add Income
        </button>
        <button className="ghost-button" onClick={onExport}>
          Export Report
        </button>
      </div>

      <BudgetProgressWidget
        spent={budgetSummary?.spent || 0}
        totalBudget={budgetSummary?.totalBudget || 0}
        percentUsed={budgetSummary?.percentUsed || 0}
      />
    </div>
  );
}
