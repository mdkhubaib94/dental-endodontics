import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  bookingId: { type: String, index: true },
  action: { type: String },
  actor: {
    userId: String,
    identity: String,
    role: String,
    name: String,
  },
  chosenDoctor: {
    id: String,
    identity: String,
    name: String,
  },
  reason: String,
  previousStatus: String,
  newStatus: String,
  meta: mongoose.Schema.Types.Mixed,
});

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
