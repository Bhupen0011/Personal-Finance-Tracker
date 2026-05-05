import mongoose from 'mongoose';

const offlineDraftSchema = new mongoose.Schema(
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
    clientDraftId: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['shared_expense', 'settlement', 'group_create'],
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'pending',
      index: true,
    },
    syncedAt: Date,
  },
  {
    timestamps: true,
  },
);

offlineDraftSchema.index({ userId: 1, clientDraftId: 1 }, { unique: true });

const OfflineDraft = mongoose.model('OfflineDraft', offlineDraftSchema);

export default OfflineDraft;
