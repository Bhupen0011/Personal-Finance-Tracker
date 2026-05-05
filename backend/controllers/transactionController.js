import Transaction from '../models/Transaction.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildTransactionFilters } from '../utils/dateRange.js';
import { serializeTransaction } from '../utils/serializers.js';

export const createTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.create({
    userId: req.user._id,
    type: req.body.type,
    title: req.body.title,
    category: req.body.type === 'income' ? 'Income' : req.body.category,
    amount: req.body.amount,
    date: req.body.date,
    notes: req.body.notes,
    paymentMethod: req.body.paymentMethod,
  });

  res.status(201).json({
    message: 'Transaction created',
    transaction: serializeTransaction(transaction),
  });
});

export const getTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const filters = buildTransactionFilters({
    userId: req.user._id,
    search: req.query.search,
    category: req.query.category,
    type: req.query.type,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  const [transactions, total] = await Promise.all([
    Transaction.find(filters).sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments(filters),
  ]);

  res.json({
    transactions: transactions.map(serializeTransaction),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  const nextType = req.body.type ?? transaction.type;

  transaction.type = nextType;
  transaction.title = req.body.title ?? transaction.title;
  transaction.category = nextType === 'income' ? 'Income' : req.body.category ?? transaction.category;
  transaction.amount = req.body.amount ?? transaction.amount;
  transaction.date = req.body.date ?? transaction.date;
  transaction.notes = req.body.notes ?? transaction.notes;
  transaction.paymentMethod = req.body.paymentMethod ?? transaction.paymentMethod;

  await transaction.save();

  res.json({
    message: 'Transaction updated',
    transaction: serializeTransaction(transaction),
  });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  res.json({ message: 'Transaction deleted' });
});
