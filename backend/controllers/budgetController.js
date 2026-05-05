import Budget from '../models/Budget.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createBudget = asyncHandler(async (req, res) => {
  const { category, monthlyLimit, month, year } = req.body;

  const budget = await Budget.findOneAndUpdate(
    {
      userId: req.user._id,
      category,
      month,
      year,
    },
    {
      userId: req.user._id,
      category,
      monthlyLimit,
      month,
      year,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  res.status(201).json({
    message: 'Budget saved',
    budget,
  });
});

export const getBudgets = asyncHandler(async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();

  const budgets = await Budget.find({
    userId: req.user._id,
    month,
    year,
  }).sort({ category: 1 });

  res.json({
    budgets,
    summary: {
      month,
      year,
      totalBudget: budgets.reduce((sum, budget) => sum + budget.monthlyLimit, 0),
      categories: budgets.length,
    },
  });
});
