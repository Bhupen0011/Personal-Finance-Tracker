import mongoose from 'mongoose';

const templateMemberSchema = new mongoose.Schema(
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

const expenseTemplateSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
      min: 0,
      default: 0,
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
    members: {
      type: [templateMemberSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

expenseTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });

const ExpenseTemplate = mongoose.model('ExpenseTemplate', expenseTemplateSchema);

export default ExpenseTemplate;
