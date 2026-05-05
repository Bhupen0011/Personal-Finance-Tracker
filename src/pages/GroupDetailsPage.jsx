import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import TopHeader from '../components/TopHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import groupService from '../services/groupService';
import { formatCurrency, formatDate } from '../utils/formatters';

function buildDefaultExpenseDraft(group) {
  return {
    title: '',
    category: 'Travel',
    amount: '',
    currency: group?.baseCurrency || 'INR',
    fxRate: 1,
    paidByUserId: '',
    splitType: 'equal',
    notes: '',
    receiptUrl: '',
    tags: '',
    personalCategory: '',
    syncToPersonal: false,
    saveAsTemplate: false,
    templateName: '',
    recurringEnabled: false,
    recurringFrequency: 'monthly',
    recurringInterval: 1,
    splitWith: [],
    splits: [],
  };
}

export default function GroupDetailsPage() {
  const { groupId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('expenses');
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState(buildDefaultExpenseDraft());
  const [commentDrafts, setCommentDrafts] = useState({});
  const [saving, setSaving] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');

  const fetchDetails = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await groupService.getGroupDetails(groupId);
      setData(response);
      setExpenseDraft((current) => ({
        ...buildDefaultExpenseDraft(response.group),
        paidByUserId:
          current.paidByUserId
          || response.group.members.find((member) => member.status === 'active')?.userId
          || '',
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [groupId]);

  const activeMembers = useMemo(() => {
    return (data?.group?.members || []).filter((member) => member.status === 'active');
  }, [data]);

  const filteredActivity = useMemo(() => {
    const search = activitySearch.trim().toLowerCase();
    if (!search) {
      return data?.activity || [];
    }

    return (data?.activity || []).filter((item) =>
      [item.message, item.action, item.actorName].some((value) =>
        String(value || '').toLowerCase().includes(search),
      ),
    );
  }, [activitySearch, data]);

  const handleSplitSelection = (member, checked) => {
    setExpenseDraft((current) => {
      const existing = new Set(current.splitWith);
      if (checked) {
        existing.add(String(member.userId || member.email));
      } else {
        existing.delete(String(member.userId || member.email));
      }

      const splitWith = Array.from(existing);
      const splits = splitWith.map((identifier) => {
        const matchedMember = activeMembers.find(
          (candidate) => String(candidate.userId || candidate.email) === String(identifier),
        );
        const previous = current.splits.find((item) => String(item.userId || item.email) === String(identifier));
        return {
          userId: matchedMember?.userId || null,
          email: matchedMember?.email || previous?.email || '',
          name: matchedMember?.name || previous?.name || '',
          amount: previous?.amount || '',
          percent: previous?.percent || '',
          shares: previous?.shares || '',
          capAmount: previous?.capAmount || '',
          excluded: previous?.excluded || false,
          items: previous?.items || [],
        };
      });

      return {
        ...current,
        splitWith,
        splits,
      };
    });
  };

  const updateSplitField = (identifier, field, value) => {
    setExpenseDraft((current) => ({
      ...current,
      splits: current.splits.map((split) =>
        String(split.userId || split.email) === String(identifier)
          ? { ...split, [field]: value }
          : split,
      ),
    }));
  };

  const handleCreateExpense = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await groupService.createSharedExpense(groupId, {
        title: expenseDraft.title,
        category: expenseDraft.category,
        amount: Number(expenseDraft.amount),
        currency: expenseDraft.currency,
        fxRate: Number(expenseDraft.fxRate || 1),
        paidByUserId: expenseDraft.paidByUserId,
        splitType: expenseDraft.splitType,
        splitWith: expenseDraft.splitWith,
        splits: expenseDraft.splits.map((split) => ({
          userId: split.userId || undefined,
          email: split.email,
          amount: split.amount === '' ? 0 : Number(split.amount),
          percent: split.percent === '' ? 0 : Number(split.percent),
          shares: split.shares === '' ? 0 : Number(split.shares),
          capAmount: split.capAmount === '' ? null : Number(split.capAmount),
          excluded: Boolean(split.excluded),
          items: split.items || [],
        })),
        notes: expenseDraft.notes,
        receiptUrl: expenseDraft.receiptUrl,
        tags: expenseDraft.tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        personalCategory: expenseDraft.personalCategory,
        syncToPersonal: expenseDraft.syncToPersonal,
        saveAsTemplate: expenseDraft.saveAsTemplate
          ? { name: expenseDraft.templateName || expenseDraft.title }
          : undefined,
        recurringRule: expenseDraft.recurringEnabled
          ? {
              enabled: true,
              frequency: expenseDraft.recurringFrequency,
              interval: Number(expenseDraft.recurringInterval || 1),
            }
          : undefined,
      });

      setAddExpenseOpen(false);
      setExpenseDraft(buildDefaultExpenseDraft(data?.group));
      await fetchDetails();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save expense');
    } finally {
      setSaving(false);
    }
  };

  const addComment = async (expenseId, reaction = '') => {
    const text = commentDrafts[expenseId] || '';
    if (!text.trim() && !reaction) {
      return;
    }

    try {
      await groupService.commentOnExpense(groupId, expenseId, { text, reaction });
      setCommentDrafts((current) => ({ ...current, [expenseId]: '' }));
      await fetchDetails();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to post comment');
    }
  };

  const applyTemplate = (template) => {
    const splitWith = (template.members || []).map((member) => String(member.userId || member.email));
    setExpenseDraft((current) => ({
      ...current,
      title: template.title,
      category: template.category,
      amount: template.amount,
      currency: template.currency,
      splitType: template.splitType,
      splitWith,
      splits: (template.members || []).map((member) => ({
        userId: member.userId || null,
        email: member.email,
        name: member.name,
        amount: member.amount || '',
        percent: member.percent || '',
        shares: member.shares || '',
        capAmount: '',
        excluded: false,
        items: [],
      })),
    }));
    setAddExpenseOpen(true);
  };

  const runRecurringNow = async () => {
    try {
      await groupService.runRecurringRules();
      await fetchDetails();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to run recurring rules');
    }
  };

  return (
    <AppLayout>
      <TopHeader
        eyebrow="Group Workspace"
        title={data?.group?.name || 'Group Details'}
        searchValue={activitySearch}
        onSearchChange={setActivitySearch}
        searchPlaceholder="Search activity"
        actions={(
          <div className="flex gap-3">
            <button className="secondary-button" onClick={runRecurringNow}>
              Run Recurring
            </button>
            <button className="primary-button" onClick={() => setAddExpenseOpen(true)}>
              Add Shared Expense
            </button>
          </div>
        )}
      />

      {loading ? (
        <LoadingSpinner label="Loading group..." />
      ) : error ? (
        <EmptyState
          title="Group unavailable"
          description={error}
          action={(
            <button className="primary-button" onClick={fetchDetails}>
              Retry
            </button>
          )}
        />
      ) : (
        <>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="panel-card p-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Summary</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <MetricCard label="Total Group Expense" value={formatCurrency(data?.totals?.totalExpense || 0)} />
                <MetricCard label="Pending Settlements" value={data?.totals?.pendingSettlements || 0} />
                <MetricCard label="Your Balance" value={data?.yourBalance?.message || 'All settled up'} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(data?.group?.members || []).map((member) => (
                  <span key={`${member.email}-${member.role}`} className="rounded-full bg-panel px-3 py-2 text-xs font-bold text-slate-700">
                    {member.name} · {member.role}
                  </span>
                ))}
              </div>
            </div>

            <div className="panel-card p-6">
              <h3 className="text-xl font-bold text-ink">Smart Settle-up</h3>
              <p className="mt-1 text-sm text-muted">Minimal payment paths based on net balances.</p>
              <div className="mt-4 space-y-3">
                {(data?.simplifiedBalances || []).slice(0, 4).map((item) => (
                  <div key={`${item.fromEmail}-${item.toEmail}-${item.amount}`} className="rounded-2xl border border-line bg-panel p-3 text-sm">
                    <p className="font-bold text-ink">{item.fromName} → {item.toName}</p>
                    <p className="text-negative">Pay {formatCurrency(item.amount)}</p>
                  </div>
                ))}
                {!data?.simplifiedBalances?.length && <p className="text-sm text-muted">No payments needed right now.</p>}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {['expenses', 'balances', 'members'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'secondary-button !py-2.5' : 'ghost-button !py-2.5'}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'expenses' ? 'Expenses' : tab === 'balances' ? 'Balances' : 'Members'}
              </button>
            ))}
          </div>

          {activeTab === 'expenses' && (
            <div className="panel-card mt-5 p-6">
              <div className="mb-5 flex flex-wrap gap-2">
                {(data?.templates || []).slice(0, 4).map((template) => (
                  <button key={template._id} type="button" className="rounded-full bg-brandSoft px-3 py-2 text-xs font-bold text-brand" onClick={() => applyTemplate(template)}>
                    Use template: {template.name}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {(data?.expenses || []).map((expense) => (
                  <div key={expense._id} className="rounded-[22px] border border-line bg-panel p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold text-ink">{expense.title}</p>
                        <p className="text-sm text-muted">{expense.category} · {expense.splitType} split · {formatDate(expense.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-ink">{expense.currency} {expense.amount}</p>
                        <p className={expense.status === 'settled' ? 'text-sm font-semibold text-positive' : 'text-sm font-semibold text-negative'}>
                          {expense.status.replaceAll('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted">Paid by {expense.paidBy?.name}</p>
                    <p className="mt-1 text-sm text-muted">{expense.notes || 'No notes'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(expense.tags || []).map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">{tag}</span>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-line bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Comments & Reactions</p>
                      <div className="mt-2 space-y-2">
                        {(expense.comments || []).slice(-3).map((comment) => (
                          <p key={`${comment.userId}-${comment.createdAt}`} className="text-sm text-slate-700">
                            <span className="font-bold">{comment.userName}:</span> {comment.text || comment.reaction}
                          </p>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input
                          className="input-field !rounded-xl !py-2 text-sm"
                          placeholder="Add comment"
                          value={commentDrafts[expense._id] || ''}
                          onChange={(event) => setCommentDrafts((current) => ({ ...current, [expense._id]: event.target.value }))}
                        />
                        <button type="button" className="ghost-button !py-2.5" onClick={() => addComment(expense._id, '👍')}>
                          👍
                        </button>
                        <button type="button" className="secondary-button !py-2.5" onClick={() => addComment(expense._id)}>
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'balances' && (
            <div className="panel-card mt-5 p-6">
              <h3 className="text-2xl font-bold text-ink">Who Owes Whom</h3>
              <div className="mt-4 space-y-3">
                {(data?.simplifiedBalances || []).map((item) => (
                  <div key={`${item.fromEmail}-${item.toEmail}-${item.amount}`} className="rounded-2xl border border-line bg-panel p-4">
                    <p className="text-sm font-bold text-ink">{item.fromName} owes {item.toName}</p>
                    <p className="text-lg font-bold text-negative">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
                {!data?.simplifiedBalances?.length && <p className="text-sm text-muted">Everyone is settled.</p>}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="panel-card mt-5 p-6">
              <h3 className="text-2xl font-bold text-ink">Members</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(data?.group?.members || []).map((member) => (
                  <div key={`${member.email}-${member.role}`} className="rounded-2xl border border-line bg-panel p-4">
                    <p className="font-bold text-ink">{member.name}</p>
                    <p className="text-sm text-muted">{member.email}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-accent">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel-card mt-5 p-6">
            <h3 className="text-2xl font-bold text-ink">Activity Feed</h3>
            <div className="mt-4 space-y-3">
              {filteredActivity.slice(0, 15).map((item) => (
                <div key={item._id} className="rounded-2xl border border-line bg-panel p-4">
                  <p className="font-semibold text-ink">{item.message}</p>
                  <p className="text-xs text-muted">{formatDate(item.createdAt)} · {item.action}</p>
                </div>
              ))}
              {!filteredActivity.length && <p className="text-sm text-muted">No activity found.</p>}
            </div>
          </div>
        </>
      )}

      {addExpenseOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/35 px-4 py-8 backdrop-blur-sm">
          <form className="mx-auto w-full max-w-4xl rounded-[30px] bg-white p-6 shadow-[0_38px_80px_rgba(15,23,42,0.2)]" onSubmit={handleCreateExpense}>
            <h3 className="text-2xl font-bold text-ink">Add Shared Expense</h3>
            <p className="mt-2 text-sm text-muted">Supports equal, unequal, percentage, and shares-based split logic.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input label="Expense title" value={expenseDraft.title} onChange={(value) => setExpenseDraft((current) => ({ ...current, title: value }))} required />
              <Input label="Category" value={expenseDraft.category} onChange={(value) => setExpenseDraft((current) => ({ ...current, category: value }))} required />
              <Input label="Total amount" type="number" value={expenseDraft.amount} onChange={(value) => setExpenseDraft((current) => ({ ...current, amount: value }))} required />
              <Input label="FX rate" type="number" value={expenseDraft.fxRate} onChange={(value) => setExpenseDraft((current) => ({ ...current, fxRate: value }))} />
              <Select label="Currency" value={expenseDraft.currency} onChange={(value) => setExpenseDraft((current) => ({ ...current, currency: value }))} options={['INR', 'USD', 'EUR']} />
              <Select
                label="Paid by"
                value={expenseDraft.paidByUserId}
                onChange={(value) => setExpenseDraft((current) => ({ ...current, paidByUserId: value }))}
                options={activeMembers.map((member) => ({ value: member.userId, label: member.name }))}
              />
              <Select
                label="Split type"
                value={expenseDraft.splitType}
                onChange={(value) => setExpenseDraft((current) => ({ ...current, splitType: value }))}
                options={[
                  { value: 'equal', label: 'Equal' },
                  { value: 'unequal', label: 'Unequal' },
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'shares', label: 'Shares' },
                ]}
              />
              <Input label="Tags (comma separated)" value={expenseDraft.tags} onChange={(value) => setExpenseDraft((current) => ({ ...current, tags: value }))} />
              <Input label="Receipt URL" value={expenseDraft.receiptUrl} onChange={(value) => setExpenseDraft((current) => ({ ...current, receiptUrl: value }))} />
              <Select
                label="Personal category (optional)"
                value={expenseDraft.personalCategory}
                onChange={(value) => setExpenseDraft((current) => ({ ...current, personalCategory: value }))}
                options={[
                  { value: '', label: 'Do not sync to personal' },
                  { value: 'Food', label: 'Food' },
                  { value: 'Travel', label: 'Travel' },
                  { value: 'Bills', label: 'Bills' },
                  { value: 'Shopping', label: 'Shopping' },
                  { value: 'Health', label: 'Health' },
                  { value: 'Education', label: 'Education' },
                ]}
              />
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-ink">Notes</span>
              <textarea
                className="input-field min-h-[90px]"
                value={expenseDraft.notes}
                onChange={(event) => setExpenseDraft((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            <div className="mt-6 rounded-2xl border border-line bg-panel p-4">
              <p className="text-sm font-bold text-ink">Split with members</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeMembers.map((member) => {
                  const identifier = String(member.userId || member.email);
                  const checked = expenseDraft.splitWith.includes(identifier);
                  return (
                    <label key={identifier} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => handleSplitSelection(member, event.target.checked)}
                      />
                      {member.name}
                    </label>
                  );
                })}
              </div>

              {!!expenseDraft.splits.length && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted">
                        <th className="py-2 pr-3">Member</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2 pr-3">%</th>
                        <th className="py-2 pr-3">Shares</th>
                        <th className="py-2 pr-3">Cap</th>
                        <th className="py-2">Exclude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseDraft.splits.map((split) => {
                        const identifier = String(split.userId || split.email);
                        return (
                          <tr key={identifier}>
                            <td className="py-2 pr-3 font-semibold text-ink">{split.name}</td>
                            <td className="py-2 pr-3">
                              <input className="input-field !rounded-xl !py-2" type="number" value={split.amount} onChange={(event) => updateSplitField(identifier, 'amount', event.target.value)} />
                            </td>
                            <td className="py-2 pr-3">
                              <input className="input-field !rounded-xl !py-2" type="number" value={split.percent} onChange={(event) => updateSplitField(identifier, 'percent', event.target.value)} />
                            </td>
                            <td className="py-2 pr-3">
                              <input className="input-field !rounded-xl !py-2" type="number" value={split.shares} onChange={(event) => updateSplitField(identifier, 'shares', event.target.value)} />
                            </td>
                            <td className="py-2 pr-3">
                              <input className="input-field !rounded-xl !py-2" type="number" value={split.capAmount} onChange={(event) => updateSplitField(identifier, 'capAmount', event.target.value)} />
                            </td>
                            <td className="py-2">
                              <input type="checkbox" checked={split.excluded} onChange={(event) => updateSplitField(identifier, 'excluded', event.target.checked)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Toggle label="Save as template" checked={expenseDraft.saveAsTemplate} onChange={(checked) => setExpenseDraft((current) => ({ ...current, saveAsTemplate: checked }))} />
              <Toggle label="Create recurring rule" checked={expenseDraft.recurringEnabled} onChange={(checked) => setExpenseDraft((current) => ({ ...current, recurringEnabled: checked }))} />
              <Toggle label="Sync to personal ledger" checked={expenseDraft.syncToPersonal} onChange={(checked) => setExpenseDraft((current) => ({ ...current, syncToPersonal: checked }))} />
            </div>

            {expenseDraft.saveAsTemplate && (
              <div className="mt-4">
                <Input label="Template name" value={expenseDraft.templateName} onChange={(value) => setExpenseDraft((current) => ({ ...current, templateName: value }))} />
              </div>
            )}

            {expenseDraft.recurringEnabled && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Select
                  label="Frequency"
                  value={expenseDraft.recurringFrequency}
                  onChange={(value) => setExpenseDraft((current) => ({ ...current, recurringFrequency: value }))}
                  options={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'custom_days', label: 'Custom days' },
                  ]}
                />
                <Input label="Interval" type="number" value={expenseDraft.recurringInterval} onChange={(value) => setExpenseDraft((current) => ({ ...current, recurringInterval: value }))} />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="ghost-button" onClick={() => setAddExpenseOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[22px] bg-panel p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <input className="input-field" value={value} onChange={(event) => onChange(event.target.value)} type={type} required={required} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  const normalized = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );

  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <select className="input-field" value={value} onChange={(event) => onChange(event.target.value)}>
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" className="flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3 text-left" onClick={() => onChange(!checked)}>
      <span className="text-sm font-bold text-ink">{label}</span>
      <span className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-hero' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'right-1' : 'left-1'}`} />
      </span>
    </button>
  );
}
