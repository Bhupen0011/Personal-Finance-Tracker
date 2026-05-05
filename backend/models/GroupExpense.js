import mongoose from 'mongoose';

const splitItemSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      trim: true,
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  { _id: false },
);

const splitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    percent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    shares: {
      type: Number,
      min: 0,
      default: 0,
    },
    capAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    excluded: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [splitItemSchema],
      default: [],
    },
  },
  { _id: false },
);

const groupExpenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    fxRate: {
      type: Number,
      min: 0.000001,
      default: 1,
    },
    baseAmount: {
      type: Number,
      min: 0,
      required: true,
    },
    paidBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
    },
    splitType: {
      type: String,
      enum: ['equal', 'unequal', 'percentage', 'shares'],
      default: 'equal',
      index: true,
    },
    splits: {
      type: [splitSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    receiptUrl: {
      type: String,
      default: '',
      trim: true,
    },
    receiptText: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'partially_settled', 'settled'],
      default: 'pending',
      index: true,
    },
    source: {
      type: String,
      enum: ['manual', 'template', 'recurring', 'offline'],
      default: 'manual',
    },
    recurringRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringExpenseRule',
      default: null,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseTemplate',
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    personalCategory: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    comments: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          userName: {
            type: String,
            required: true,
            trim: true,
          },
          text: {
            type: String,
            default: '',
            trim: true,
          },
          reaction: {
            type: String,
            default: '',
            trim: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

groupExpenseSchema.index({ groupId: 1, date: -1 });
groupExpenseSchema.index({ createdBy: 1, date: -1 });
groupExpenseSchema.index({ tags: 1 });

const GroupExpense = mongoose.model('GroupExpense', groupExpenseSchema);

export default GroupExpense;
