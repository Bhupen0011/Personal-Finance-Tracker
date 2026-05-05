import { Types } from 'mongoose';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundCurrency(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function normalizeMemberKey(member) {
  if (!member) {
    return '';
  }

  if (member.userId) {
    return String(member.userId);
  }

  return String(member.email || '').toLowerCase();
}

function mapDraftsByMember(drafts = []) {
  const map = new Map();

  for (const draft of drafts) {
    const byUserId = draft?.userId ? String(draft.userId) : '';
    const byEmail = draft?.email ? String(draft.email).toLowerCase() : '';

    if (byUserId) {
      map.set(byUserId, draft);
    }
    if (byEmail) {
      map.set(byEmail, draft);
    }
  }

  return map;
}

function normalizeAmountSplit(members, draftsMap) {
  const splits = members.map((member) => {
    const draft = draftsMap.get(normalizeMemberKey(member)) || {};
    const excluded = Boolean(draft.excluded);

    return {
      ...member,
      excluded,
      amount: excluded ? 0 : Math.max(0, toNumber(draft.amount)),
      percent: 0,
      shares: Math.max(0, toNumber(draft.shares)),
      capAmount: draft.capAmount == null ? null : Math.max(0, toNumber(draft.capAmount)),
      items: Array.isArray(draft.items)
        ? draft.items
            .filter((item) => item && item.item && toNumber(item.amount) >= 0)
            .map((item) => ({
              item: String(item.item),
              amount: roundCurrency(toNumber(item.amount)),
            }))
        : [],
    };
  });

  return splits;
}

function distributeEqual(total, members) {
  const eligible = members.filter((member) => !member.excluded);
  if (!eligible.length) {
    return members.map((member) => ({ ...member, amount: 0 }));
  }

  const base = roundCurrency(total / eligible.length);
  let assigned = 0;

  const result = members.map((member) => {
    if (member.excluded) {
      return { ...member, amount: 0 };
    }

    assigned += base;
    return { ...member, amount: base };
  });

  const adjustment = roundCurrency(total - assigned);
  if (adjustment !== 0) {
    const index = result.findIndex((member) => !member.excluded);
    if (index >= 0) {
      result[index].amount = roundCurrency(result[index].amount + adjustment);
    }
  }

  return result;
}

function normalizeTotals(total, splits) {
  const currentTotal = roundCurrency(
    splits.reduce((sum, split) => sum + (split.excluded ? 0 : toNumber(split.amount)), 0),
  );
  const delta = roundCurrency(total - currentTotal);

  if (delta !== 0) {
    const index = splits.findIndex((split) => !split.excluded);
    if (index >= 0) {
      splits[index].amount = roundCurrency(splits[index].amount + delta);
    }
  }

  return splits;
}

function applyCaps(splits) {
  for (const split of splits) {
    if (split.excluded || split.capAmount == null) {
      continue;
    }

    split.amount = roundCurrency(Math.min(split.amount, split.capAmount));
  }

  return splits;
}

export function buildExpenseSplits({
  amount,
  splitType,
  members,
  splitDrafts = [],
}) {
  const total = roundCurrency(Math.max(0, toNumber(amount)));
  const draftsMap = mapDraftsByMember(splitDrafts);
  let splits = normalizeAmountSplit(members, draftsMap);

  if (!splits.length) {
    return [];
  }

  if (splitType === 'equal') {
    splits = distributeEqual(total, splits);
  }

  if (splitType === 'unequal') {
    const hasDefined = splits.some((split) => !split.excluded && split.amount > 0);
    if (!hasDefined) {
      splits = distributeEqual(total, splits);
    } else {
      splits = normalizeTotals(total, splits);
    }
  }

  if (splitType === 'percentage') {
    const eligible = splits.filter((split) => !split.excluded);
    const percentageTotal = eligible.reduce((sum, split) => sum + toNumber(split.percent), 0);

    if (percentageTotal <= 0) {
      splits = distributeEqual(total, splits);
    } else {
      splits = splits.map((split) => {
        if (split.excluded) {
          return { ...split, amount: 0 };
        }

        const percent = toNumber((draftsMap.get(normalizeMemberKey(split)) || {}).percent);
        return {
          ...split,
          percent,
          amount: roundCurrency((total * percent) / 100),
        };
      });
      splits = normalizeTotals(total, splits);
    }
  }

  if (splitType === 'shares') {
    const eligible = splits.filter((split) => !split.excluded);
    const totalShares = eligible.reduce((sum, split) => sum + toNumber(split.shares), 0);

    if (totalShares <= 0) {
      splits = distributeEqual(total, splits);
    } else {
      splits = splits.map((split) => {
        if (split.excluded) {
          return { ...split, amount: 0 };
        }

        return {
          ...split,
          amount: roundCurrency((total * split.shares) / totalShares),
        };
      });
      splits = normalizeTotals(total, splits);
    }
  }

  splits = applyCaps(splits);
  splits = normalizeTotals(total, splits);

  return splits.map((split) => ({
    userId: split.userId && Types.ObjectId.isValid(split.userId) ? split.userId : undefined,
    name: split.name,
    email: split.email,
    amount: roundCurrency(split.amount),
    percent: total ? roundCurrency((split.amount / total) * 100) : 0,
    shares: split.shares,
    capAmount: split.capAmount,
    excluded: split.excluded,
    items: split.items,
  }));
}

export function buildBalanceMap(expenses, settlements) {
  const balances = new Map();

  function ensureParty(party) {
    if (!party) {
      return null;
    }

    const key = String(party.userId || party.email || '');
    if (!key) {
      return null;
    }

    if (!balances.has(key)) {
      balances.set(key, {
        userId: party.userId ? String(party.userId) : null,
        name: party.name,
        email: party.email,
        balance: 0,
      });
    }

    return balances.get(key);
  }

  for (const expense of expenses) {
    const payer = ensureParty(expense.paidBy);
    if (!payer) {
      continue;
    }

    payer.balance = roundCurrency(payer.balance + toNumber(expense.baseAmount));

    for (const split of expense.splits || []) {
      const participant = ensureParty(split);
      if (!participant || split.excluded) {
        continue;
      }

      const owed = roundCurrency(toNumber(split.amount) * toNumber(expense.fxRate || 1, 1));
      participant.balance = roundCurrency(participant.balance - owed);
    }
  }

  for (const settlement of settlements) {
    const payer = ensureParty(settlement.from);
    const receiver = ensureParty(settlement.to);

    if (!payer || !receiver) {
      continue;
    }

    const fxRate = toNumber(settlement.fxRate || 1, 1);
    let paidBase = 0;

    if (settlement.status === 'settled') {
      paidBase = roundCurrency(toNumber(settlement.amount) * fxRate);
    } else if (settlement.status === 'partially_settled') {
      paidBase = roundCurrency(
        (settlement.payments || []).reduce((sum, payment) => sum + toNumber(payment.amount), 0) * fxRate,
      );
    }

    payer.balance = roundCurrency(payer.balance + paidBase);
    receiver.balance = roundCurrency(receiver.balance - paidBase);
  }

  return balances;
}

export function simplifyDebts(balanceMap) {
  const creditors = [];
  const debtors = [];

  for (const member of balanceMap.values()) {
    const value = roundCurrency(member.balance);
    if (value > 0.01) {
      creditors.push({ ...member, balance: value });
    } else if (value < -0.01) {
      debtors.push({ ...member, balance: Math.abs(value) });
    }
  }

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const settlements = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = roundCurrency(Math.min(creditor.balance, debtor.balance));

    settlements.push({
      fromUserId: debtor.userId,
      fromName: debtor.name,
      fromEmail: debtor.email,
      toUserId: creditor.userId,
      toName: creditor.name,
      toEmail: creditor.email,
      amount,
    });

    creditor.balance = roundCurrency(creditor.balance - amount);
    debtor.balance = roundCurrency(debtor.balance - amount);

    if (creditor.balance <= 0.01) {
      creditorIndex += 1;
    }
    if (debtor.balance <= 0.01) {
      debtorIndex += 1;
    }
  }

  return settlements;
}
