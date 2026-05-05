import mongoose from 'mongoose';
import crypto from 'crypto';

const groupMemberSchema = new mongoose.Schema(
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
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'removed'],
      default: 'active',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    baseCurrency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    inviteCode: {
      type: String,
      default: () => crypto.randomBytes(4).toString('hex').toUpperCase(),
      index: true,
    },
    inviteExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
    members: {
      type: [groupMemberSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    archivedAt: Date,
  },
  {
    timestamps: true,
  },
);

groupSchema.index({ createdBy: 1, archivedAt: 1 });
groupSchema.index({ 'members.userId': 1, archivedAt: 1 });

const Group = mongoose.model('Group', groupSchema);

export default Group;
