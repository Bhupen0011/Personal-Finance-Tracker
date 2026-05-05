import mongoose from 'mongoose';

const recurringMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
  },
  { _id: false },
);

const recurringExpenseRuleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
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
    splitType: {
      type: String,
      enum: ['equal', 'unequal', 'percentage', 'shares'],
      default: 'equal',
    },
    paidBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
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
    members: {
      type: [recurringMemberSchema],
      default: [],
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'custom_days'],
      default: 'monthly',
    },
    interval: {
      type: Number,
      min: 1,
      default: 1,
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 28,
      default: 1,
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      default: 1,
    },
    nextRunAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    lastRunAt: Date,
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

recurringExpenseRuleSchema.index({ groupId: 1, isActive: 1, nextRunAt: 1 });

const RecurringExpenseRule = mongoose.model('RecurringExpenseRule', recurringExpenseRuleSchema);

export default RecurringExpenseRule;
