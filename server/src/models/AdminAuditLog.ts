import mongoose, { Schema, Document } from 'mongoose';

export type AdminAuditAction = 'user_removed' | 'user_restored' | 'buyer_approved' | 'buyer_rejected' | 'buyer_suspended';

export interface IAdminAuditLog extends Document {
  admin: mongoose.Types.ObjectId;
  action: AdminAuditAction;
  targetUser: mongoose.Types.ObjectId;
  targetRole: 'farmer' | 'buyer' | 'admin';
  targetName: string;
  reason: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: ['user_removed', 'user_restored', 'buyer_approved', 'buyer_rejected', 'buyer_suspended'],
      required: true,
    },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetRole: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true },
    targetName: { type: String, default: '' },
    reason: { type: String, default: '' },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminAuditLog = mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);
