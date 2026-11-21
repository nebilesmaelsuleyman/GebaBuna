import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationLog extends Document {
  buyer: mongoose.Types.ObjectId;
  reviewedBy: mongoose.Types.ObjectId;
  action: 'approved' | 'rejected' | 'suspended' | 'checklist_updated';
  checklistSnapshot: {
    validTradeLicense: boolean;
    validExportLicense: boolean;
    tinValid: boolean;
    noPastViolations: boolean;
  };
  reason?: string;
  notes?: string;
  reviewedAt: Date;
}

const VerificationLogSchema = new Schema<IVerificationLog>(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'BuyerProfile',
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['approved', 'rejected', 'suspended', 'checklist_updated'],
      required: true,
    },
    checklistSnapshot: {
      validTradeLicense: { type: Boolean, default: false },
      validExportLicense: { type: Boolean, default: false },
      tinValid: { type: Boolean, default: false },
      noPastViolations: { type: Boolean, default: false },
    },
    reason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const VerificationLog = mongoose.model<IVerificationLog>('VerificationLog', VerificationLogSchema);
