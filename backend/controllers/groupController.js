import { Types } from 'mongoose';
import Group from '../models/Group.js';
import GroupExpense from '../models/GroupExpense.js';
import GroupSettlement from '../models/GroupSettlement.js';
import GroupActivity from '../models/GroupActivity.js';
import ExpenseTemplate from '../models/ExpenseTemplate.js';
import RecurringExpenseRule from '../models/RecurringExpenseRule.js';
import OfflineDraft from '../models/OfflineDraft.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  buildBalanceMap,
  buildExpenseSplits,
  roundCurrency,
  simplifyDebts,
} from '../utils/groupFinance.js';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isCreator(group, userId) {
  return String(group.createdBy) === String(userId);
}

function hasActiveMember(group, user) {
  return group.members.some(
    (member) =>
      member.status !== 'removed' &&
      ((member.userId && String(member.userId) === String(user._id)) ||
        normalizeEmail(member.email) === normalizeEmail(user.email)),
  );
}

function assertGroupMember(group, user) {
  if (!isCreator(group, user._id) && !hasActiveMember(group, user)) {
    const error = new Error('You do not have access to this group');
    error.statusCode = 403;
    throw error;
  }
}

function assertGroupAdmin(group, user) {
  if (isCreator(group, user._id)) {
    return;
  }

  const isAdmin = group.members.some(
    (member) =>
      member.status !== 'removed' &&
      member.role === 'admin' &&
      ((member.userId && String(member.userId) === String(user._id)) ||
        normalizeEmail(member.email) === normalizeEmail(user.email)),
  );

  if (!isAdmin) {
    const error = new Error('Only group admins can perform this action');
    error.statusCode = 403;
    throw error;
  }
}

function toPublicMember(member) {
  return {
    userId: member.userId || null,
    name: member.name,
    email: member.email,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt,
  };
}

function toMemberRef(member) {
  return {
    userId: member.userId || null,
    name: member.name,
    email: member.email,
  };
}

async function logGroupActivity({
  groupId,
  actor,
  action,
  entityType,
  entityId,
  message,
  meta = {},
}) {
  await GroupActivity.create({
    groupId,
    actorUserId: actor._id,
    actorName: actor.name,
    action,
    entityType,
    entityId: entityId || null,
    message,
    meta,
  });
}

async function notifyUsers(users, payload) {
  const docs = users
    .filter((user) => user?.userId && String(user.userId) !== '')
    .map((user) => ({
      userId: user.userId,
      ...payload,
    }));

  if (docs.length) {
    await Notification.insertMany(docs);
  }
}

function nextRecurringDate(rule) {
  const current = new Date(rule.nextRunAt || Date.now());
  const next = new Date(current);

  if (rule.frequency === 'weekly') {
    next.setDate(next.getDate() + 7 * (rule.interval || 1));
    return next;
  }

  if (rule.frequency === 'custom_days') {
    next.setDate(next.getDate() + (rule.interval || 7));
    return next;
  }

  next.setMonth(next.getMonth() + (rule.interval || 1));
  next.setDate(Math.min(rule.dayOfMonth || 1, 28));
  return next;
}

function ensureObjectId(value) {
  return value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : null;
}

async function getGroupAndAuthorize(groupId, user) {
  const group = await Group.findById(groupId);
  if (!group || group.archivedAt) {
    const error = new Error('Group not found');
    error.statusCode = 404;
    throw error;
  }

  assertGroupMember(group, user);
  return group;
}

function buildParticipantList(group, splitWith) {
  const activeMembers = group.members.filter((member) => member.status === 'active');
  if (!Array.isArray(splitWith) || !splitWith.length) {
    return activeMembers.map(toMemberRef);
  }

  const requestedKeys = new Set(splitWith.map((item) => String(item).toLowerCase()));
  return activeMembers
    .filter((member) => {
      const byUser = member.userId ? requestedKeys.has(String(member.userId).toLowerCase()) : false;
      const byEmail = requestedKeys.has(normalizeEmail(member.email));
      return byUser || byEmail;
    })
    .map(toMemberRef);
}

function enrichExpenseForResponse(expense) {
  return {
    _id: expense._id,
    groupId: expense.groupId,
    title: expense.title,
    category: expense.category,
    amount: expense.amount,
    currency: expense.currency,
    fxRate: expense.fxRate,
    baseAmount: expense.baseAmount,
    paidBy: expense.paidBy,
    splitType: expense.splitType,
    splits: expense.splits,
    notes: expense.notes,
    receiptUrl: expense.receiptUrl,
    receiptText: expense.receiptText,
    status: expense.status,
    source: expense.source,
    tags: expense.tags || [],
    personalCategory: expense.personalCategory,
    date: expense.date,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

function getUserBalanceForMap(balanceMap, user) {
  const byUserId = balanceMap.get(String(user._id));
  if (byUserId) {
    return byUserId.balance;
  }

  const byEmail = balanceMap.get(normalizeEmail(user.email));
  if (byEmail) {
    return byEmail.balance;
  }

  return 0;
}

function formatUserGroupBalance(balance) {
  if (balance > 0.01) {
    return { type: 'owed', message: `You are owed ₹${roundCurrency(balance)}` };
  }
  if (balance < -0.01) {
    return { type: 'owe', message: `You owe ₹${roundCurrency(Math.abs(balance))}` };
  }
  return { type: 'settled', message: 'All settled up' };
}

export const createGroup = asyncHandler(async (req, res) => {
  const creator = req.user;
  const { name, description, baseCurrency, members = [], tags = [] } = req.body;

  const normalizedMembers = [];
  const seenEmails = new Set();

  const creatorEmail = normalizeEmail(creator.email);
  seenEmails.add(creatorEmail);
  normalizedMembers.push({
    userId: creator._id,
    name: creator.name,
    email: creator.email,
    role: 'admin',
    status: 'active',
  });

  for (const member of members) {
    const email = normalizeEmail(member?.email);
    if (!email || seenEmails.has(email)) {
      continue;
    }

    seenEmails.add(email);
    normalizedMembers.push({
      userId: ensureObjectId(member?.userId),
      name: String(member?.name || member?.email || 'Member').trim(),
      email,
      role: member?.role === 'admin' ? 'admin' : 'member',
      status: 'active',
    });
  }

  const group = await Group.create({
    name,
    description,
    baseCurrency: baseCurrency || 'INR',
    createdBy: creator._id,
    members: normalizedMembers,
    tags: Array.isArray(tags) ? tags : [],
  });

  await logGroupActivity({
    groupId: group._id,
    actor: creator,
    action: 'group_created',
    entityType: 'group',
    entityId: group._id,
    message: `${creator.name} created ${group.name}`,
    meta: { memberCount: normalizedMembers.length },
  });

  await notifyUsers(normalizedMembers.filter((member) => String(member.userId) !== String(creator._id)), {
    type: 'group_activity',
    title: 'Added to new group',
    message: `${creator.name} added you to ${group.name}`,
    relatedGroupId: group._id,
    relatedEntityId: group._id,
  });

  res.status(201).json({
    message: 'Group created',
    group: {
      _id: group._id,
      name: group.name,
      description: group.description,
      baseCurrency: group.baseCurrency,
      members: group.members.map(toPublicMember),
      tags: group.tags,
      inviteCode: group.inviteCode,
      inviteExpiresAt: group.inviteExpiresAt,
      createdAt: group.createdAt,
    },
  });
});

export const getGroups = asyncHandler(async (req, res) => {
  const user = req.user;
  const userEmail = normalizeEmail(user.email);
  const search = String(req.query.search || '').trim();

  const filter = {
    archivedAt: { $exists: false },
    $or: [
      { createdBy: user._id },
      { 'members.userId': user._id },
      { 'members.email': userEmail },
    ],
  };

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  const groups = await Group.find(filter).sort({ updatedAt: -1, createdAt: -1 });
  const groupIds = groups.map((group) => group._id);

  const [expenses, settlements] = await Promise.all([
    GroupExpense.find({ groupId: { $in: groupIds } }).sort({ date: -1, createdAt: -1 }),
    GroupSettlement.find({ groupId: { $in: groupIds } }).sort({ createdAt: -1 }),
  ]);

  const expensesByGroup = new Map();
  const settlementsByGroup = new Map();

  for (const expense of expenses) {
    const key = String(expense.groupId);
    if (!expensesByGroup.has(key)) {
      expensesByGroup.set(key, []);
    }
    expensesByGroup.get(key).push(expense);
  }

  for (const settlement of settlements) {
    const key = String(settlement.groupId);
    if (!settlementsByGroup.has(key)) {
      settlementsByGroup.set(key, []);
    }
    settlementsByGroup.get(key).push(settlement);
  }

  const groupCards = groups.map((group) => {
    const groupExpenses = expensesByGroup.get(String(group._id)) || [];
    const groupSettlements = settlementsByGroup.get(String(group._id)) || [];
    const totalSpending = roundCurrency(
      groupExpenses.reduce((sum, expense) => sum + roundCurrency(expense.baseAmount), 0),
    );
    const balanceMap = buildBalanceMap(groupExpenses, groupSettlements);
    const userBalance = getUserBalanceForMap(balanceMap, user);
    const latestExpense = groupExpenses[0];
    const latestActivity = latestExpense?.date || group.updatedAt;
    const pendingSettlements = groupSettlements.filter((item) => item.status !== 'settled').length;

    return {
      _id: group._id,
      name: group.name,
      description: group.description,
      baseCurrency: group.baseCurrency,
      memberCount: group.members.filter((member) => member.status === 'active').length,
      totalSpending,
      balance: roundCurrency(userBalance),
      balanceSummary: formatUserGroupBalance(userBalance),
      pendingSettlements,
      latestActivity,
      latestExpense: latestExpense
        ? {
            title: latestExpense.title,
            amount: latestExpense.amount,
            currency: latestExpense.currency,
            date: latestExpense.date,
          }
        : null,
      tags: group.tags || [],
    };
  });

  res.json({ groups: groupCards });
});

export const getGroupDetails = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const [expenses, settlements, activities, templates, recurringRules] = await Promise.all([
    GroupExpense.find({ groupId: group._id }).sort({ date: -1, createdAt: -1 }).limit(25),
    GroupSettlement.find({ groupId: group._id }).sort({ createdAt: -1 }).limit(25),
    GroupActivity.find({ groupId: group._id }).sort({ createdAt: -1 }).limit(30),
    ExpenseTemplate.find({ $or: [{ groupId: group._id }, { userId: req.user._id }] }).sort({ createdAt: -1 }).limit(20),
    RecurringExpenseRule.find({ groupId: group._id, isActive: true }).sort({ nextRunAt: 1 }).limit(20),
  ]);

  const balanceMap = buildBalanceMap(expenses, settlements);
  const simplified = simplifyDebts(balanceMap);
  const totals = {
    totalExpense: roundCurrency(expenses.reduce((sum, expense) => sum + roundCurrency(expense.baseAmount), 0)),
    pendingSettlements: settlements.filter((item) => item.status !== 'settled').length,
    expenseCount: expenses.length,
  };
  const userBalance = getUserBalanceForMap(balanceMap, req.user);

  res.json({
    group: {
      _id: group._id,
      name: group.name,
      description: group.description,
      baseCurrency: group.baseCurrency,
      tags: group.tags || [],
      inviteCode: group.inviteCode,
      inviteExpiresAt: group.inviteExpiresAt,
      members: group.members.map(toPublicMember),
      createdAt: group.createdAt,
    },
    totals,
    yourBalance: {
      value: roundCurrency(userBalance),
      ...formatUserGroupBalance(userBalance),
    },
    expenses: expenses.map(enrichExpenseForResponse),
    balances: Array.from(balanceMap.values()).map((item) => ({
      ...item,
      balance: roundCurrency(item.balance),
    })),
    simplifiedBalances: simplified,
    settlements,
    templates,
    recurringRules,
    activity: activities,
  });
});

export const addGroupMembers = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  assertGroupAdmin(group, req.user);

  const incoming = Array.isArray(req.body.members) ? req.body.members : [];
  if (!incoming.length) {
    res.status(400);
    throw new Error('At least one member is required');
  }

  const existingEmailSet = new Set(group.members.map((member) => normalizeEmail(member.email)));
  const addedMembers = [];

  for (const member of incoming) {
    const email = normalizeEmail(member.email);
    if (!email || existingEmailSet.has(email)) {
      continue;
    }

    existingEmailSet.add(email);
    const nextMember = {
      userId: ensureObjectId(member.userId),
      name: String(member.name || member.email || 'Member').trim(),
      email,
      role: member.role === 'admin' ? 'admin' : 'member',
      status: 'active',
    };

    group.members.push(nextMember);
    addedMembers.push(nextMember);
  }

  await group.save();

  await logGroupActivity({
    groupId: group._id,
    actor: req.user,
    action: 'members_added',
    entityType: 'member',
    message: `${req.user.name} added ${addedMembers.length} member(s)`,
    meta: { members: addedMembers.map((member) => member.email) },
  });

  await notifyUsers(addedMembers, {
    type: 'group_activity',
    title: 'Added to group',
    message: `${req.user.name} added you to ${group.name}`,
    relatedGroupId: group._id,
    relatedEntityId: group._id,
  });

  res.json({
    message: 'Members updated',
    members: group.members.map(toPublicMember),
  });
});

export const createSharedExpense = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const {
    title,
    category,
    amount,
    currency,
    fxRate,
    paidByUserId,
    splitType = 'equal',
    splitWith,
    splits = [],
    notes,
    receiptUrl,
    receiptText,
    tags = [],
    personalCategory,
    source = 'manual',
    templateId,
    saveAsTemplate,
    recurringRule,
    date,
    syncToPersonal,
  } = req.body;

  const numericAmount = Math.max(0, Number(amount || 0));
  if (!numericAmount) {
    res.status(400);
    throw new Error('Amount must be greater than zero');
  }

  const participants = buildParticipantList(group, splitWith);
  if (!participants.length) {
    res.status(400);
    throw new Error('No participants selected for this split');
  }

  const paidBy = participants.find((member) => String(member.userId) === String(paidByUserId))
    || group.members
      .filter((member) => member.status === 'active')
      .map(toMemberRef)
      .find((member) => String(member.userId) === String(paidByUserId))
    || {
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
    };

  const nextFxRate = Number(fxRate || 1) > 0 ? Number(fxRate) : 1;
  const computedSplits = buildExpenseSplits({
    amount: numericAmount,
    splitType,
    members: participants,
    splitDrafts: Array.isArray(splits) ? splits : [],
  });
  const baseAmount = roundCurrency(numericAmount * nextFxRate);
  const expenseSource = ['manual', 'template', 'recurring', 'offline'].includes(source) ? source : 'manual';

  const expense = await GroupExpense.create({
    groupId: group._id,
    createdBy: req.user._id,
    title,
    category: category || 'General',
    amount: numericAmount,
    currency: currency || group.baseCurrency || 'INR',
    fxRate: nextFxRate,
    baseAmount,
    paidBy,
    splitType,
    splits: computedSplits,
    notes: notes || '',
    receiptUrl: receiptUrl || '',
    receiptText: receiptText || (receiptUrl ? 'OCR extraction queued' : ''),
    tags: Array.isArray(tags) ? tags : [],
    personalCategory: personalCategory || '',
    source: expenseSource,
    templateId: ensureObjectId(templateId),
    date: date ? new Date(date) : new Date(),
  });

  let createdTemplate = null;
  if (saveAsTemplate) {
    createdTemplate = await ExpenseTemplate.create({
      userId: req.user._id,
      groupId: group._id,
      name: String(saveAsTemplate.name || title).trim(),
      title,
      category: category || 'General',
      amount: numericAmount,
      currency: currency || group.baseCurrency || 'INR',
      splitType,
      members: computedSplits.map((split) => ({
        userId: split.userId || null,
        name: split.name,
        email: split.email,
        amount: split.amount,
        percent: split.percent,
        shares: split.shares,
      })),
      notes: notes || '',
      tags: Array.isArray(tags) ? tags : [],
    });
  }

  let createdRecurringRule = null;
  if (recurringRule?.enabled) {
    createdRecurringRule = await RecurringExpenseRule.create({
      userId: req.user._id,
      groupId: group._id,
      title,
      category: category || 'General',
      amount: numericAmount,
      currency: currency || group.baseCurrency || 'INR',
      splitType,
      paidBy,
      members: computedSplits.map((split) => ({
        userId: split.userId || null,
        name: split.name,
        email: split.email,
        amount: split.amount,
        percent: split.percent,
        shares: split.shares,
      })),
      frequency: recurringRule.frequency || 'monthly',
      interval: Number(recurringRule.interval || 1),
      dayOfMonth: Number(recurringRule.dayOfMonth || 1),
      dayOfWeek: Number(recurringRule.dayOfWeek || 1),
      nextRunAt: recurringRule.nextRunAt ? new Date(recurringRule.nextRunAt) : new Date(),
      notes: notes || '',
      tags: Array.isArray(tags) ? tags : [],
      isActive: true,
    });
  }

  if (syncToPersonal && personalCategory && String(req.user._id) === String(paidBy.userId)) {
    await Transaction.create({
      userId: req.user._id,
      type: 'expense',
      title: `${title} (shared)`,
      category: personalCategory,
      amount: numericAmount,
      date: expense.date,
      notes: notes || '',
      paymentMethod: 'UPI',
    });
  }

  await logGroupActivity({
    groupId: group._id,
    actor: req.user,
    action: 'expense_added',
    entityType: 'expense',
    entityId: expense._id,
    message: `${req.user.name} added ${expense.title} (${expense.currency} ${expense.amount})`,
    meta: { splitType: expense.splitType, participants: expense.splits.length },
  });

  await notifyUsers(
    computedSplits.filter(
      (split) =>
        split.userId &&
        String(split.userId) !== String(req.user._id) &&
        !split.excluded,
    ),
    {
      type: 'group_activity',
      title: 'New shared expense',
      message: `${req.user.name} added "${expense.title}" in ${group.name}`,
      relatedGroupId: group._id,
      relatedEntityId: expense._id,
    },
  );

  res.status(201).json({
    message: 'Shared expense added',
    expense: enrichExpenseForResponse(expense),
    template: createdTemplate,
    recurringRule: createdRecurringRule,
  });
});

export const getGroupExpenses = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const search = String(req.query.search || '').trim();

  const filters = { groupId: group._id };
  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
    ];
  }
  if (req.query.status) {
    filters.status = req.query.status;
  }
  if (req.query.splitType) {
    filters.splitType = req.query.splitType;
  }
  if (req.query.tag) {
    filters.tags = req.query.tag;
  }
  if (req.query.startDate || req.query.endDate) {
    filters.date = {};
    if (req.query.startDate) {
      filters.date.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filters.date.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
    }
  }

  const [expenses, total] = await Promise.all([
    GroupExpense.find(filters).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    GroupExpense.countDocuments(filters),
  ]);

  res.json({
    expenses: expenses.map(enrichExpenseForResponse),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

export const addExpenseComment = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const expense = await GroupExpense.findOne({
    _id: req.params.expenseId,
    groupId: group._id,
  });

  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }

  const text = String(req.body.text || '').trim();
  const reaction = String(req.body.reaction || '').trim();
  if (!text && !reaction) {
    res.status(400);
    throw new Error('Text or reaction is required');
  }

  expense.comments.push({
    userId: req.user._id,
    userName: req.user.name,
    text,
    reaction,
    createdAt: new Date(),
  });
  await expense.save();

  await logGroupActivity({
    groupId: group._id,
    actor: req.user,
    action: 'expense_commented',
    entityType: 'expense',
    entityId: expense._id,
    message: `${req.user.name} commented on ${expense.title}`,
  });

  await notifyUsers(
    [expense.paidBy],
    {
      type: 'group_activity',
      title: 'New expense comment',
      message: `${req.user.name} commented on "${expense.title}"`,
      relatedGroupId: group._id,
      relatedEntityId: expense._id,
    },
  );

  res.status(201).json({
    message: 'Comment added',
    comments: expense.comments,
  });
});

export const getGroupBalances = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const [expenses, settlements] = await Promise.all([
    GroupExpense.find({ groupId: group._id }).sort({ date: -1, createdAt: -1 }),
    GroupSettlement.find({ groupId: group._id }).sort({ createdAt: -1 }),
  ]);

  const balanceMap = buildBalanceMap(expenses, settlements);
  const simplified = simplifyDebts(balanceMap);
  const userBalance = getUserBalanceForMap(balanceMap, req.user);
  const latestExpense = expenses[0];

  res.json({
    balanceSummary: {
      value: roundCurrency(userBalance),
      ...formatUserGroupBalance(userBalance),
      pendingSettlementsCount: settlements.filter((item) => item.status !== 'settled').length,
      latestSharedExpense: latestExpense
        ? {
            title: latestExpense.title,
            amount: latestExpense.amount,
            currency: latestExpense.currency,
            date: latestExpense.date,
          }
        : null,
    },
    members: Array.from(balanceMap.values()).map((item) => ({
      ...item,
      balance: roundCurrency(item.balance),
    })),
    whoOwesWhom: simplified,
  });
});

export const createSettlement = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const {
    fromUserId,
    toUserId,
    amount,
    currency,
    fxRate,
    status = 'pending',
    method,
    note,
    attachmentUrl,
  } = req.body;

  const memberRefs = group.members.filter((member) => member.status === 'active').map(toMemberRef);
  const from = memberRefs.find((member) => String(member.userId) === String(fromUserId));
  const to = memberRefs.find((member) => String(member.userId) === String(toUserId));

  if (!from || !to) {
    res.status(400);
    throw new Error('Invalid settlement participants');
  }

  if (String(from.userId) === String(to.userId)) {
    res.status(400);
    throw new Error('Payer and receiver cannot be the same');
  }

  const numericAmount = Math.max(Number(amount || 0), 0);
  if (!numericAmount) {
    res.status(400);
    throw new Error('Settlement amount must be greater than zero');
  }

  const nextFxRate = Number(fxRate || 1) > 0 ? Number(fxRate) : 1;
  const normalizedStatus = ['pending', 'partially_settled', 'settled'].includes(status) ? status : 'pending';
  const payments = normalizedStatus === 'settled' ? [{ amount: numericAmount, date: new Date(), note: 'Initial settlement' }] : [];

  const settlement = await GroupSettlement.create({
    groupId: group._id,
    from,
    to,
    amount: numericAmount,
    currency: currency || group.baseCurrency || 'INR',
    fxRate: nextFxRate,
    baseAmount: roundCurrency(numericAmount * nextFxRate),
    status: normalizedStatus,
    method: method || 'UPI',
    note: note || '',
    attachmentUrl: attachmentUrl || '',
    payments,
    settledAt: normalizedStatus === 'settled' ? new Date() : null,
  });

  await logGroupActivity({
    groupId: group._id,
    actor: req.user,
    action: 'settlement_created',
    entityType: 'settlement',
    entityId: settlement._id,
    message: `${from.name} to pay ${to.name} ${settlement.currency} ${settlement.amount}`,
  });

  await notifyUsers(
    [to],
    {
      type: 'settlement_due',
      title: 'Settlement recorded',
      message: `${from.name} owes you ${settlement.currency} ${settlement.amount} in ${group.name}`,
      relatedGroupId: group._id,
      relatedEntityId: settlement._id,
    },
  );

  res.status(201).json({
    message: 'Settlement recorded',
    settlement,
  });
});

export const recordSettlementPayment = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const settlement = await GroupSettlement.findOne({
    _id: req.params.settlementId,
    groupId: group._id,
  });

  if (!settlement) {
    res.status(404);
    throw new Error('Settlement not found');
  }

  const amount = Math.max(Number(req.body.amount || 0), 0);
  if (!amount) {
    res.status(400);
    throw new Error('Payment amount must be greater than zero');
  }

  settlement.payments.push({
    amount,
    date: req.body.date ? new Date(req.body.date) : new Date(),
    note: req.body.note || '',
  });

  const paid = roundCurrency(settlement.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  if (paid >= settlement.amount) {
    settlement.status = 'settled';
    settlement.settledAt = new Date();
  } else {
    settlement.status = 'partially_settled';
  }

  await settlement.save();

  await logGroupActivity({
    groupId: group._id,
    actor: req.user,
    action: 'settlement_payment_recorded',
    entityType: 'settlement',
    entityId: settlement._id,
    message: `${req.user.name} recorded payment of ${settlement.currency} ${amount}`,
  });

  await notifyUsers(
    [settlement.to],
    {
      type: 'settlement_received',
      title: 'Settlement payment update',
      message: `Payment of ${settlement.currency} ${amount} recorded in ${group.name}`,
      relatedGroupId: group._id,
      relatedEntityId: settlement._id,
    },
  );

  res.json({
    message: 'Payment recorded',
    settlement,
  });
});

export const getGroupSettlements = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

  const filters = { groupId: group._id };
  if (req.query.status) {
    filters.status = req.query.status;
  }

  const [settlements, total] = await Promise.all([
    GroupSettlement.find(filters).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    GroupSettlement.countDocuments(filters),
  ]);

  res.json({
    settlements,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

export const getGroupActivity = asyncHandler(async (req, res) => {
  const group = await getGroupAndAuthorize(req.params.id, req.user);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  const [activity, total] = await Promise.all([
    GroupActivity.find({ groupId: group._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    GroupActivity.countDocuments({ groupId: group._id }),
  ]);

  res.json({
    activity,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

export const getSharedExpenseHistory = asyncHandler(async (req, res) => {
  const user = req.user;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const search = String(req.query.search || '').trim();

  const groups = await Group.find({
    archivedAt: { $exists: false },
    $or: [
      { createdBy: user._id },
      { 'members.userId': user._id },
      { 'members.email': normalizeEmail(user.email) },
    ],
  }).select('_id name');

  const groupIds = groups.map((group) => group._id);
  const groupNameMap = new Map(groups.map((group) => [String(group._id), group.name]));

  const filters = { groupId: { $in: groupIds } };
  if (req.query.groupId && Types.ObjectId.isValid(req.query.groupId)) {
    filters.groupId = new Types.ObjectId(req.query.groupId);
  }
  if (req.query.status) {
    filters.status = req.query.status;
  }
  if (req.query.splitType) {
    filters.splitType = req.query.splitType;
  }
  if (req.query.tag) {
    filters.tags = req.query.tag;
  }
  if (req.query.member) {
    const member = normalizeEmail(req.query.member);
    filters['splits.email'] = member;
  }
  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } },
      { 'paidBy.name': { $regex: search, $options: 'i' } },
    ];
  }
  if (req.query.startDate || req.query.endDate) {
    filters.date = {};
    if (req.query.startDate) {
      filters.date.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filters.date.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
    }
  }

  const [expenses, total] = await Promise.all([
    GroupExpense.find(filters).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    GroupExpense.countDocuments(filters),
  ]);

  res.json({
    history: expenses.map((expense) => ({
      _id: expense._id,
      title: expense.title,
      groupId: expense.groupId,
      groupName: groupNameMap.get(String(expense.groupId)) || 'Group',
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency,
      splitType: expense.splitType,
      paidBy: expense.paidBy,
      status: expense.status,
      tags: expense.tags || [],
      date: expense.date,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

export const getSettleUpSuggestions = asyncHandler(async (req, res) => {
  const user = req.user;
  const groupId = req.query.groupId;
  let targetGroupIds = [];

  if (groupId && Types.ObjectId.isValid(groupId)) {
    const group = await getGroupAndAuthorize(groupId, user);
    targetGroupIds = [group._id];
  } else {
    const groups = await Group.find({
      archivedAt: { $exists: false },
      $or: [
        { createdBy: user._id },
        { 'members.userId': user._id },
        { 'members.email': normalizeEmail(user.email) },
      ],
    }).select('_id');
    targetGroupIds = groups.map((group) => group._id);
  }

  const [expenses, settlements] = await Promise.all([
    GroupExpense.find({ groupId: { $in: targetGroupIds } }),
    GroupSettlement.find({ groupId: { $in: targetGroupIds } }),
  ]);

  const balanceMap = buildBalanceMap(expenses, settlements);
  const suggestions = simplifyDebts(balanceMap);

  res.json({
    suggestions,
    summary: {
      suggestionCount: suggestions.length,
      totalSuggestedAmount: roundCurrency(suggestions.reduce((sum, item) => sum + item.amount, 0)),
    },
  });
});

export const createExpenseTemplate = asyncHandler(async (req, res) => {
  const payload = req.body;
  const template = await ExpenseTemplate.create({
    userId: req.user._id,
    groupId: ensureObjectId(payload.groupId),
    name: payload.name,
    title: payload.title,
    category: payload.category || 'General',
    amount: Number(payload.amount || 0),
    currency: payload.currency || 'INR',
    splitType: payload.splitType || 'equal',
    members: Array.isArray(payload.members) ? payload.members : [],
    notes: payload.notes || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
  });

  res.status(201).json({
    message: 'Template created',
    template,
  });
});

export const getExpenseTemplates = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.groupId && Types.ObjectId.isValid(req.query.groupId)) {
    filter.$or = [{ userId: req.user._id }, { groupId: new Types.ObjectId(req.query.groupId) }];
  }

  const templates = await ExpenseTemplate.find(filter).sort({ createdAt: -1 });
  res.json({ templates });
});

export const createRecurringRule = asyncHandler(async (req, res) => {
  const payload = req.body;
  const rule = await RecurringExpenseRule.create({
    userId: req.user._id,
    groupId: payload.groupId,
    title: payload.title,
    category: payload.category || 'General',
    amount: Number(payload.amount || 0),
    currency: payload.currency || 'INR',
    splitType: payload.splitType || 'equal',
    paidBy: payload.paidBy,
    members: Array.isArray(payload.members) ? payload.members : [],
    frequency: payload.frequency || 'monthly',
    interval: Number(payload.interval || 1),
    dayOfMonth: Number(payload.dayOfMonth || 1),
    dayOfWeek: Number(payload.dayOfWeek || 1),
    nextRunAt: payload.nextRunAt ? new Date(payload.nextRunAt) : new Date(),
    notes: payload.notes || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    isActive: payload.isActive !== false,
  });

  res.status(201).json({
    message: 'Recurring rule created',
    rule,
  });
});

export const getRecurringRules = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.groupId && Types.ObjectId.isValid(req.query.groupId)) {
    filter.groupId = new Types.ObjectId(req.query.groupId);
  }
  if (req.query.isActive != null) {
    filter.isActive = String(req.query.isActive) !== 'false';
  }

  const rules = await RecurringExpenseRule.find(filter).sort({ nextRunAt: 1, createdAt: -1 });
  res.json({ rules });
});

export const runRecurringRules = asyncHandler(async (req, res) => {
  const now = new Date();
  const dueRules = await RecurringExpenseRule.find({
    userId: req.user._id,
    isActive: true,
    nextRunAt: { $lte: now },
  });

  const createdExpenses = [];

  for (const rule of dueRules) {
    const group = await Group.findById(rule.groupId);
    if (!group || group.archivedAt) {
      continue;
    }

    const computedSplits = buildExpenseSplits({
      amount: rule.amount,
      splitType: rule.splitType,
      members: rule.members,
      splitDrafts: rule.members,
    });

    const expense = await GroupExpense.create({
      groupId: rule.groupId,
      createdBy: req.user._id,
      title: rule.title,
      category: rule.category,
      amount: rule.amount,
      currency: rule.currency,
      fxRate: 1,
      baseAmount: roundCurrency(rule.amount),
      paidBy: rule.paidBy,
      splitType: rule.splitType,
      splits: computedSplits,
      notes: rule.notes || '',
      tags: rule.tags || [],
      source: 'recurring',
      recurringRuleId: rule._id,
      date: now,
    });

    rule.lastRunAt = now;
    rule.nextRunAt = nextRecurringDate(rule);
    await rule.save();

    await logGroupActivity({
      groupId: rule.groupId,
      actor: req.user,
      action: 'recurring_expense_generated',
      entityType: 'recurring',
      entityId: expense._id,
      message: `Recurring expense "${rule.title}" generated`,
    });

    createdExpenses.push(expense);
  }

  res.json({
    message: 'Recurring rules processed',
    createdCount: createdExpenses.length,
    expenses: createdExpenses.map(enrichExpenseForResponse),
  });
});

export const saveOfflineDraft = asyncHandler(async (req, res) => {
  const { clientDraftId, type, payload, groupId, status } = req.body;

  const draft = await OfflineDraft.findOneAndUpdate(
    {
      userId: req.user._id,
      clientDraftId,
    },
    {
      userId: req.user._id,
      clientDraftId,
      type,
      payload: payload || {},
      groupId: ensureObjectId(groupId),
      status: status || 'pending',
      syncedAt: status === 'synced' ? new Date() : null,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  res.status(201).json({
    message: 'Draft saved',
    draft,
  });
});

export const getOfflineDrafts = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const drafts = await OfflineDraft.find(filter).sort({ updatedAt: -1 });
  res.json({ drafts });
});

export const syncOfflineDraft = asyncHandler(async (req, res) => {
  const draft = await OfflineDraft.findOne({
    _id: req.params.draftId,
    userId: req.user._id,
  });

  if (!draft) {
    res.status(404);
    throw new Error('Draft not found');
  }

  draft.status = 'synced';
  draft.syncedAt = new Date();
  await draft.save();

  res.json({
    message: 'Draft synced',
    draft,
  });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.readAt).length,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    userId: req.user._id,
  });

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  res.json({
    message: 'Notification marked as read',
    notification,
  });
});

export const exportSharedHistoryCsv = asyncHandler(async (req, res) => {
  const user = req.user;
  const groups = await Group.find({
    archivedAt: { $exists: false },
    $or: [
      { createdBy: user._id },
      { 'members.userId': user._id },
      { 'members.email': normalizeEmail(user.email) },
    ],
  }).select('_id name');

  const groupMap = new Map(groups.map((group) => [String(group._id), group.name]));
  const expenses = await GroupExpense.find({
    groupId: { $in: groups.map((group) => group._id) },
  }).sort({ date: -1, createdAt: -1 });

  const rows = [
    ['Expense', 'Group', 'Category', 'Amount', 'Currency', 'Paid By', 'Split Type', 'Status', 'Date'].join(','),
  ];

  for (const expense of expenses) {
    rows.push(
      [
        `"${expense.title.replace(/"/g, '""')}"`,
        `"${(groupMap.get(String(expense.groupId)) || 'Group').replace(/"/g, '""')}"`,
        expense.category,
        expense.amount,
        expense.currency,
        `"${expense.paidBy.name.replace(/"/g, '""')}"`,
        expense.splitType,
        expense.status,
        new Date(expense.date).toISOString().slice(0, 10),
      ].join(','),
    );
  }

  res.json({
    filename: `shared-expense-history-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: rows.join('\n'),
  });
});
