import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import TopHeader from '../components/TopHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import groupService from '../services/groupService';
import { formatCurrency, formatDate } from '../utils/formatters';

const defaultGroupForm = {
  name: '',
  description: '',
  baseCurrency: 'INR',
  membersText: '',
};

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState(defaultGroupForm);
  const [saving, setSaving] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    setError('');

    try {
      const [groupsResponse, notificationsResponse] = await Promise.all([
        groupService.getGroups({ search }),
        groupService.getNotifications({ limit: 8 }),
      ]);
      setGroups(groupsResponse.groups || []);
      setNotifications(notificationsResponse.notifications || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchGroups();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const totals = useMemo(() => {
    return groups.reduce(
      (accumulator, group) => ({
        spending: accumulator.spending + Number(group.totalSpending || 0),
        pendingSettlements: accumulator.pendingSettlements + Number(group.pendingSettlements || 0),
      }),
      { spending: 0, pendingSettlements: 0 },
    );
  }, [groups]);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const members = groupDraft.membersText
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean)
        .map((email) => ({ email, name: email.split('@')[0] }));

      await groupService.createGroup({
        name: groupDraft.name,
        description: groupDraft.description,
        baseCurrency: groupDraft.baseCurrency,
        members,
      });

      setGroupDraft(defaultGroupForm);
      setCreateOpen(false);
      await fetchGroups();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <TopHeader
        eyebrow="Collaboration"
        title="Groups"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search groups"
        actions={(
          <div className="flex gap-3">
            <button className="secondary-button" onClick={fetchGroups}>
              Refresh
            </button>
            <button className="primary-button" onClick={() => setCreateOpen(true)}>
              Create Group
            </button>
          </div>
        )}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="panel-card p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Active Groups" value={groups.length} />
            <MetricCard label="Group Spending" value={formatCurrency(totals.spending)} />
            <MetricCard label="Pending Settlements" value={totals.pendingSettlements} />
          </div>
        </div>

        <div className="panel-card p-6">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-accent">Inbox</p>
          <h3 className="mt-2 text-2xl font-bold text-ink">Notifications</h3>
          <p className="mt-1 text-sm text-muted">{unreadCount} unread updates</p>
          <div className="mt-4 space-y-3">
            {notifications.slice(0, 3).map((notification) => (
              <button
                key={notification._id}
                type="button"
                className="w-full rounded-2xl border border-line bg-panel px-4 py-3 text-left"
                onClick={() => groupService.markNotificationRead(notification._id).then(fetchGroups)}
              >
                <p className="text-sm font-bold text-ink">{notification.title}</p>
                <p className="text-xs text-muted">{notification.message}</p>
              </button>
            ))}
            {!notifications.length && <p className="text-sm text-muted">No notifications yet.</p>}
          </div>
        </div>
      </div>

      <div className="panel-card mt-5 p-6">
        {loading ? (
          <LoadingSpinner label="Loading groups..." />
        ) : error ? (
          <EmptyState
            title="Groups unavailable"
            description={error}
            action={(
              <button className="primary-button" onClick={fetchGroups}>
                Retry
              </button>
            )}
          />
        ) : groups.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <Link
                key={group._id}
                to={`/groups/${group._id}`}
                className="rounded-[24px] border border-line bg-panel p-5 transition hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-ink">{group.name}</p>
                    <p className="text-sm text-muted">{group.memberCount} members</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {group.pendingSettlements} pending
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <p className="font-semibold text-ink">
                    Total: {formatCurrency(group.totalSpending || 0)}
                  </p>
                  <p className={group.balanceSummary?.type === 'owe' ? 'font-semibold text-negative' : 'font-semibold text-positive'}>
                    {group.balanceSummary?.message || 'All settled up'}
                  </p>
                  <p className="text-muted">
                    Latest activity: {group.latestActivity ? formatDate(group.latestActivity) : '--'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No groups yet"
            description="Create your first group to start shared expense tracking."
            action={(
              <button className="primary-button" onClick={() => setCreateOpen(true)}>
                Create Group
              </button>
            )}
          />
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm">
          <form className="w-full max-w-2xl rounded-[30px] bg-white p-6 shadow-[0_38px_80px_rgba(15,23,42,0.2)]" onSubmit={handleCreateGroup}>
            <h3 className="text-2xl font-bold text-ink">Create Group</h3>
            <p className="mt-2 text-sm text-muted">Add emails separated by commas to invite members.</p>
            <div className="mt-6 grid gap-4">
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">Group name</span>
                <input
                  className="input-field"
                  value={groupDraft.name}
                  onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">Description</span>
                <input
                  className="input-field"
                  value={groupDraft.description}
                  onChange={(event) => setGroupDraft((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-bold text-ink">Base currency</span>
                  <select
                    className="input-field"
                    value={groupDraft.baseCurrency}
                    onChange={(event) => setGroupDraft((current) => ({ ...current, baseCurrency: event.target.value }))}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold text-ink">Members (emails)</span>
                  <input
                    className="input-field"
                    placeholder="rahul@mail.com, priya@mail.com"
                    value={groupDraft.membersText}
                    onChange={(event) => setGroupDraft((current) => ({ ...current, membersText: event.target.value }))}
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="ghost-button" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Creating...' : 'Create Group'}
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
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
