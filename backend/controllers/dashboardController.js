import { Types } from 'mongoose';
import Budget from '../models/Budget.js';
import Group from '../models/Group.js';
import GroupExpense from '../models/GroupExpense.js';
import GroupSettlement from '../models/GroupSettlement.js';
import Transaction from '../models/Transaction.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  buildBalanceMap,
  roundCurrency,
  simplifyDebts,
} from '../utils/groupFinance.js';
import {
  calculatePercentageChange,
  getMonthRange,
  getPreviousMonth,
  getRollingMonths,
} from '../utils/dateRange.js';
import { serializeTransaction } from '../utils/serializers.js';

async function aggregateTotals(match) {
  const [result] = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        income: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0],
          },
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  return result || { income: 0, expense: 0 };
}

async function getCurrentBudgetProgress(userId, month, year) {
  const budgets = await Budget.find({ userId, month, year }).sort({ category: 1 });
  const { start, end } = getMonthRange(month, year);

  const spending = await Transaction.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: '$category',
        spent: { $sum: '$amount' },
      },
    },
  ]);

  const spendingMap = new Map(spending.map((item) => [item._id, item.spent]));

  return budgets.map((budget) => {
    const spent = spendingMap.get(budget.category) || 0;
    const remaining = Math.max(budget.monthlyLimit - spent, 0);
    const percentUsed = budget.monthlyLimit ? (spent / budget.monthlyLimit) * 100 : 0;

    return {
      category: budget.category,
      monthlyLimit: budget.monthlyLimit,
      spent,
      remaining,
      percentUsed,
    };
  });
}

async function getGroupWidgetSummary(user) {
  const groups = await Group.find({
    archivedAt: { $exists: false },
    $or: [
      { createdBy: user._id },
      { 'members.userId': user._id },
      { 'members.email': String(user.email || '').toLowerCase() },
    ],
  }).select('_id name');

  if (!groups.length) {
    return {
      groupCount: 0,
      pendingSettlementsCount: 0,
      netGroupBalance: 0,
      receivable: 0,
      payable: 0,
      latestSharedExpense: null,
      suggestedPayments: [],
    };
  }

  const groupIds = groups.map((group) => group._id);
  const [expenses, settlements] = await Promise.all([
    GroupExpense.find({ groupId: { $in: groupIds } }).sort({ date: -1, createdAt: -1 }).limit(100),
    GroupSettlement.find({ groupId: { $in: groupIds } }).sort({ createdAt: -1 }),
  ]);
  const balanceMap = buildBalanceMap(expenses, settlements);
  const currentUserKey = String(user._id);
  const userById = balanceMap.get(currentUserKey);
  const userByEmail = balanceMap.get(String(user.email || '').toLowerCase());
  const userBalance = userById?.balance ?? userByEmail?.balance ?? 0;
  const latestExpense = expenses[0];

  return {
    groupCount: groups.length,
    pendingSettlementsCount: settlements.filter((item) => item.status !== 'settled').length,
    netGroupBalance: roundCurrency(userBalance),
    receivable: roundCurrency(Math.max(userBalance, 0)),
    payable: roundCurrency(Math.max(-userBalance, 0)),
    latestSharedExpense: latestExpense
      ? {
          title: latestExpense.title,
          groupId: latestExpense.groupId,
          groupName: groups.find((group) => String(group._id) === String(latestExpense.groupId))?.name || 'Group',
          amount: latestExpense.amount,
          currency: latestExpense.currency,
          date: latestExpense.date,
        }
      : null,
    suggestedPayments: simplifyDebts(balanceMap)
      .filter((item) => String(item.fromUserId) === currentUserKey || String(item.toUserId) === currentUserKey)
      .slice(0, 4),
  };
}

export const getSummary = asyncHandler(async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  const userId = req.user._id;
  const { start, end } = getMonthRange(month, year);
  const previousPeriod = getPreviousMonth(month, year);
  const { start: previousStart, end: previousEnd } = getMonthRange(previousPeriod.month, previousPeriod.year);

  const [allTimeTotals, currentTotals, previousTotals, recentTransactions, budgetProgress, groupWidget] = await Promise.all([
    aggregateTotals({ userId: new Types.ObjectId(userId) }),
    aggregateTotals({ userId: new Types.ObjectId(userId), date: { $gte: start, $lt: end } }),
    aggregateTotals({ userId: new Types.ObjectId(userId), date: { $gte: previousStart, $lt: previousEnd } }),
    Transaction.find({ userId }).sort({ date: -1, createdAt: -1 }).limit(8),
    getCurrentBudgetProgress(userId, month, year),
    getGroupWidgetSummary(req.user),
  ]);

  const balance = allTimeTotals.income - allTimeTotals.expense;
  const savings = currentTotals.income - currentTotals.expense;
  const previousSavings = previousTotals.income - previousTotals.expense;
  const totalBudget = budgetProgress.reduce((sum, item) => sum + item.monthlyLimit, 0);
  const spent = budgetProgress.reduce((sum, item) => sum + item.spent, 0);

  res.json({
    month,
    year,
    totals: {
      balance,
      income: currentTotals.income,
      expense: currentTotals.expense,
      savings,
      savingsRate: currentTotals.income ? (savings / currentTotals.income) * 100 : 0,
      balanceDelta: calculatePercentageChange(savings, previousSavings),
    },
    recentTransactions: recentTransactions.map(serializeTransaction),
    budgetProgress,
    budgetHighlights: {
      totalBudget,
      spent,
      remaining: Math.max(totalBudget - spent, 0),
      percentUsed: totalBudget ? (spent / totalBudget) * 100 : 0,
    },
    groupWidget,
  });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  const userId = req.user._id;
  const { start, end } = getMonthRange(month, year);
  const rollingMonths = getRollingMonths(month, year, 6);
  const rangeStart = new Date(rollingMonths[0].year, rollingMonths[0].month - 1, 1);
  const rangeEnd = new Date(year, month, 1);

  const [categoryBreakdown, totalsByMonth, budgetsByMonth, budgetProgress, overallTotals] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: rangeStart, $lt: rangeEnd },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]),
    Budget.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          year: { $gte: rollingMonths[0].year, $lte: year },
        },
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
          },
          budget: { $sum: '$monthlyLimit' },
        },
      },
    ]),
    getCurrentBudgetProgress(userId, month, year),
    aggregateTotals({ userId: new Types.ObjectId(userId) }),
  ]);

  const totalsMap = new Map(
    totalsByMonth.map((item) => [
      `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${item._id.type}`,
      item.total,
    ]),
  );
  const budgetsMap = new Map(
    budgetsByMonth.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, '0')}`, item.budget]),
  );

  const monthlyOverview = rollingMonths.map((item) => ({
    label: item.label,
    income: totalsMap.get(`${item.key}-income`) || 0,
    expense: totalsMap.get(`${item.key}-expense`) || 0,
    budget: budgetsMap.get(item.key) || 0,
  }));

  const currentSavings = Math.max(overallTotals.income - overallTotals.expense, 0);
  const savingsTarget = 150000;

  res.json({
    categoryBreakdown: categoryBreakdown.map((item) => ({
      category: item._id,
      amount: item.amount,
    })),
    monthlyOverview,
    overspendingAlerts: budgetProgress.filter((item) => item.percentUsed >= 90),
    savingsGoal: {
      target: savingsTarget,
      current: currentSavings,
      percentage: Math.min((currentSavings / savingsTarget) * 100, 100),
    },
  });
});
