import mongoose from 'mongoose';

const CaseDraftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
    },
    routeKey: {
      type: String,
      required: true,
      trim: true,
    },
    step: {
      type: Number,
      default: 0,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

CaseDraftSchema.index({ userId: 1, patientId: 1, routeKey: 1 }, { unique: true });
CaseDraftSchema.index({ userId: 1, patientId: 1, updatedAt: -1 });

export default mongoose.models.CaseDraft || mongoose.model('CaseDraft', CaseDraftSchema);