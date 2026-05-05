import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import TopHeader from '../components/TopHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import groupService from '../services/groupService';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function SettlementsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [settlementDraft, setSettlementDraft] = useState({
    fromUserId: '',
    toUserId: '',
    amount: '',
    status: 'pending',
    method: 'UPI',
    note: '',
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      const groupsResponse = await groupService.getGroups();
      const list = groupsResponse.groups || [];
      setGroups(list);
      const nextGroupId = selectedGroupId || list[0]?._id || '';
      setSelectedGroupId(nextGroupId);

      const [suggestionsResponse, settlementsResponse, detailsResponse] = await Promise.all([
        groupService.getSettleSuggestions(nextGroupId ? { groupId: nextGroupId } : {}),
        nextGroupId
          ? groupService.getGroupSettlements(nextGroupId, { limit: 50 })
          : Promise.resolve({ settlements: [] }),
        nextGroupId ? groupService.getGroupDetails(nextGroupId) : Promise.resolve(null),
      ]);

      setSuggestions(suggestionsResponse.suggestions || []);
      setSettlements(settlementsResponse.settlements || []);
      setSelectedGroupDetails(detailsResponse);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load settlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    (async () => {
      try {
        const [suggestionsResponse, settlementsResponse, detailsResponse] = await Promise.all([
          groupService.getSettleSuggestions({ groupId: selectedGroupId }),
          groupService.getGroupSettlements(selectedGroupId, { limit: 50 }),
          groupService.getGroupDetails(selectedGroupId),
        ]);
        setSuggestions(suggestionsResponse.suggestions || []);
        setSettlements(settlementsResponse.settlements || []);
        setSelectedGroupDetails(detailsResponse);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to refresh settlements');
      }
    })();
  }, [selectedGroupId]);

  const activeMembers = useMemo(
    () => (selectedGroupDetails?.group?.members || []).filter((member) => member.status === 'active'),
    [selectedGroupDetails],
  );

  const createSettlement = async (event) => {
    event.preventDefault();
    if (!selectedGroupId) {
      return;
    }

    try {
      await groupService.createSettlement(selectedGroupId, {
        fromUserId: settlementDraft.fromUserId,
        toUserId: settlementDraft.toUserId,
        amount: Number(settlementDraft.amount),
        status: settlementDraft.status,
        method: settlementDraft.method,
        note: settlementDraft.note,
      });
      setCreateOpen(false);
      setSettlementDraft({
        fromUserId: '',
        toUserId: '',
        amount: '',
        status: 'pending',
        method: 'UPI',
        note: '',
      });
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create settlement');
    }
  };

  const recordPayment = async (settlement) => {
    const value = paymentDrafts[settlement._id];
    if (!value || Number(value) <= 0) {
      return;
    }

    try {
      await groupService.recordSettlementPayment(selectedGroupId, settlement._id, {
        amount: Number(value),
      });
      setPaymentDrafts((current) => ({ ...current, [settlement._id]: '' }));
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to record payment');
    }
  };

  return (
    <AppLayout>
      <TopHeader
        eyebrow="Group Finance"
        title="Balances & Settlements"
        actions={(
          <div className="flex gap-3">
            <button className="ghost-button" onClick={() => navigate('/shared-history')}>
              Shared History
            </button>
            <button className="secondary-button" onClick={fetchData}>
              Refresh
            </button>
            <button className="primary-button" onClick={() => setCreateOpen(true)}>
              Record Settlement
            </button>
          </div>
        )}
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <select className="input-field max-w-[320px]" value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
          {groups.map((group) => (
            <option key={group._id} value={group._id}>
              {group.name}
            </option>
          ))}
          {!groups.length && <option value="">No groups</option>}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading settlements..." />
      ) : error ? (
        <EmptyState
          title="Settlements unavailable"
          description={error}
          action={(
            <button className="primary-button" onClick={fetchData}>
              Retry
            </button>
          )}
        />
      ) : (
        <>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
            <div className="panel-card p-6">
              <h3 className="text-2xl font-bold text-ink">Who Owes Whom</h3>
              <p className="mt-1 text-sm text-muted">Smart settle-up suggestions for minimum transfers.</p>
              <div className="mt-4 space-y-3">
                {suggestions.map((item) => (
                  <div key={`${item.fromEmail}-${item.toEmail}-${item.amount}`} className="rounded-2xl border border-line bg-panel p-4">
                    <p className="font-bold text-ink">{item.fromName} pays {item.toName}</p>
                    <p className="mt-1 text-negative">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
                {!suggestions.length && <p className="text-sm text-muted">No pending debts for this view.</p>}
              </div>
            </div>

            <div className="panel-card p-6">
              <h3 className="text-2xl font-bold text-ink">Quick Stats</h3>
              <div className="mt-4 space-y-3">
                <StatCard label="Pending" value={settlements.filter((item) => item.status === 'pending').length} />
                <StatCard label="Partially Settled" value={settlements.filter((item) => item.status === 'partially_settled').length} />
                <StatCard label="Settled" value={settlements.filter((item) => item.status === 'settled').length} />
              </div>
            </div>
          </div>

          <div className="panel-card mt-5 p-6">
            <h3 className="text-2xl font-bold text-ink">Settlement Ledger</h3>
            <div className="mt-4 space-y-4">
              {settlements.map((settlement) => (
                <div key={settlement._id} className="rounded-2xl border border-line bg-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{settlement.from?.name} → {settlement.to?.name}</p>
                      <p className="text-sm text-muted">{formatDate(settlement.createdAt)} · {settlement.method}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${settlement.status === 'settled' ? 'bg-positiveSoft text-positive' : settlement.status === 'partially_settled' ? 'bg-brandSoft text-brand' : 'bg-negativeSoft text-negative'}`}>
                      {settlement.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-ink">{settlement.currency} {settlement.amount}</p>
                  <p className="text-sm text-muted">{settlement.note || 'No note'}</p>
                  {settlement.status !== 'settled' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        className="input-field max-w-[180px] !rounded-xl !py-2"
                        type="number"
                        placeholder="Amount"
                        value={paymentDrafts[settlement._id] || ''}
                        onChange={(event) => setPaymentDrafts((current) => ({ ...current, [settlement._id]: event.target.value }))}
                      />
                      <button type="button" className="secondary-button !py-2.5" onClick={() => recordPayment(settlement)}>
                        Record Payment
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!settlements.length && <p className="text-sm text-muted">No settlements recorded yet.</p>}
            </div>
          </div>
        </>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-sm">
          <form className="w-full max-w-2xl rounded-[30px] bg-white p-6 shadow-[0_38px_80px_rgba(15,23,42,0.2)]" onSubmit={createSettlement}>
            <h3 className="text-2xl font-bold text-ink">Record Settlement</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">From</span>
                <select className="input-field" value={settlementDraft.fromUserId} onChange={(event) => setSettlementDraft((current) => ({ ...current, fromUserId: event.target.value }))} required>
                  <option value="">Select member</option>
                  {activeMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">To</span>
                <select className="input-field" value={settlementDraft.toUserId} onChange={(event) => setSettlementDraft((current) => ({ ...current, toUserId: event.target.value }))} required>
                  <option value="">Select member</option>
                  {activeMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">Amount</span>
                <input className="input-field" type="number" value={settlementDraft.amount} onChange={(event) => setSettlementDraft((current) => ({ ...current, amount: event.target.value }))} required />
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">Status</span>
                <select className="input-field" value={settlementDraft.status} onChange={(event) => setSettlementDraft((current) => ({ ...current, status: event.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="partially_settled">Partially settled</option>
                  <option value="settled">Settled</option>
                </select>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-bold text-ink">Note</span>
              <input className="input-field" value={settlementDraft.note} onChange={(event) => setSettlementDraft((current) => ({ ...current, note: event.target.value }))} />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="ghost-button" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-panel p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
