import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Education', 'Income'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    paymentMethod: {
      type: String,
      default: 'UPI',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
