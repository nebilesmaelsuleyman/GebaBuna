import mongoose, { Schema, Document } from 'mongoose';

export type BuyerBusinessType = 'exporter' | 'cooperative_union' | 'roaster' | 'local_trader';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';

export interface IUploadedDoc {
  title: string;
  fileUrl: string;
  docType: 'trade_license' | 'export_license' | 'tin_certificate' | 'tax_clearance' | 'other';
  uploadedAt: Date;
}

export interface IBuyerProfile extends Document {
  user: mongoose.Types.ObjectId;
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  businessType: BuyerBusinessType;
  region: string;
  zone: string;
  address: string;
  tradeLicenseNumber: string;
  exportLicenseNumber?: string;
  tinNumber: string;
  yearsInBusiness: number;
  uploadedDocuments: IUploadedDoc[];
  preferredCoffeeTypes: string[];
  preferredVolumes: string;
  // Verification
  verificationStatus: VerificationStatus;
  verificationChecklist: {
    validTradeLicense: boolean;
    validExportLicense: boolean;
    tinValid: boolean;
    noPastViolations: boolean;
  };
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNotes?: string;
  // Stats
  totalKgBought: number;
  fairnessScore: number; // 0 - 100
  fairnessRank: number;
  numberCompletedTrades: number;
  averageRatingFromFarmers: number; // 1.0 - 5.0
  totalRatingPoints: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BuyerProfileSchema = new Schema<IBuyerProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    businessType: {
      type: String,
      enum: ['exporter', 'cooperative_union', 'roaster', 'local_trader'],
      default: 'exporter',
    },
    region: {
      type: String,
      default: 'Oromia',
    },
    zone: {
      type: String,
      default: 'Jimma',
    },
    address: {
      type: String,
      default: 'Jimma Commercial Center, Aba Jifar St.',
    },
    tradeLicenseNumber: {
      type: String,
      required: true,
      default: 'ET-JIM-2024-9988',
    },
    exportLicenseNumber: {
      type: String,
      default: 'EXP-MO-5421',
    },
    tinNumber: {
      type: String,
      required: true,
      default: '0098765432',
    },
    yearsInBusiness: {
      type: Number,
      default: 5,
    },
    uploadedDocuments: [
      {
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        docType: {
          type: String,
          enum: ['trade_license', 'export_license', 'tin_certificate', 'tax_clearance', 'other'],
          default: 'trade_license',
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    preferredCoffeeTypes: {
      type: [String],
      default: ['Jimma Washed G1', 'Jimma Washed G2', 'Limmu Specialty', 'Jimma Natural G1'],
    },
    preferredVolumes: {
      type: String,
      default: '5,000 - 50,000 kg per harvest',
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected', 'suspended'],
      default: 'pending',
    },
    verificationChecklist: {
      validTradeLicense: { type: Boolean, default: false },
      validExportLicense: { type: Boolean, default: false },
      tinValid: { type: Boolean, default: false },
      noPastViolations: { type: Boolean, default: false },
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    totalKgBought: {
      type: Number,
      default: 0,
    },
    fairnessScore: {
      type: Number,
      default: 88,
    },
    fairnessRank: {
      type: Number,
      default: 1,
    },
    numberCompletedTrades: {
      type: Number,
      default: 0,
    },
    averageRatingFromFarmers: {
      type: Number,
      default: 4.9,
    },
    totalRatingPoints: {
      type: Number,
      default: 4.9,
    },
    ratingCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const BuyerProfile = mongoose.model<IBuyerProfile>('BuyerProfile', BuyerProfileSchema);
