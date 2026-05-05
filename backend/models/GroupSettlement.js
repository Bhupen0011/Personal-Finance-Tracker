import mongoose from 'mongoose';

const settlementPaymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false },
);

const partySchema = new mongoose.Schema(
  {
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
  { _id: false },
);

const groupSettlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    from: {
      type: partySchema,
      required: true,
    },
    to: {
      type: partySchema,
      required: true,
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
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'partially_settled', 'settled'],
      default: 'pending',
      index: true,
    },
    method: {
      type: String,
      default: 'UPI',
      trim: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    attachmentUrl: {
      type: String,
      default: '',
      trim: true,
    },
    payments: {
      type: [settlementPaymentSchema],
      default: [],
    },
    settledAt: Date,
  },
  {
    timestamps: true,
  },
);

groupSettlementSchema.index({ groupId: 1, status: 1, createdAt: -1 });

const GroupSettlement = mongoose.model('GroupSettlement', groupSettlementSchema);

export default GroupSettlement;
