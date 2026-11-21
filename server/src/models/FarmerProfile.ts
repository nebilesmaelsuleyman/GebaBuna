import mongoose, { Schema, Document } from 'mongoose';

export interface IFarmerProfile extends Document {
  user: mongoose.Types.ObjectId;
  fullName: string;
  phone: string;
  email?: string;
  photo?: string;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  farmSizeHectares: number;
  estimatedCostPerKg?: number;
  numberOfTrees?: number;
  coffeeVarieties: string[];
  processingMethods: ('washed' | 'natural' | 'honey')[];
  certifications: string[];
  cooperativeMembership?: string;
  preferredLanguage: 'om' | 'am' | 'en';
  shortBio?: string;
  // Stats
  totalKgSold: number;
  averageQualityScore: number; // 0 - 100
  qualityRank: number;
  numberCompletedTrades: number;
  averageRatingFromBuyers: number; // 1.0 - 5.0
  totalRatingPoints: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const FarmerProfileSchema = new Schema<IFarmerProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
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
      trim: true,
      lowercase: true,
    },
    photo: {
      type: String,
      default: '',
    },
    region: {
      type: String,
      default: 'Oromia',
    },
    zone: {
      type: String,
      default: 'Jimma',
    },
    woreda: {
      type: String,
      required: true,
      default: 'Mana',
    },
    kebele: {
      type: String,
      required: true,
      default: 'Kenteri',
    },
    farmSizeHectares: {
      type: Number,
      required: true,
      default: 2.5,
    },
    estimatedCostPerKg: {
      type: Number,
      min: 0,
    },
    numberOfTrees: {
      type: Number,
      default: 3000,
    },
    coffeeVarieties: {
      type: [String],
      default: ['Jimma Heirloom', '74110', '74112'],
    },
    processingMethods: {
      type: [String],
      enum: ['washed', 'natural', 'honey'],
      default: ['natural', 'washed'],
    },
    certifications: {
      type: [String],
      default: ['Organic Certified'],
    },
    cooperativeMembership: {
      type: String,
      default: '',
    },
    preferredLanguage: {
      type: String,
      enum: ['om', 'am', 'en'],
      default: 'om',
    },
    shortBio: {
      type: String,
      default: 'Third-generation specialty coffee grower in Jimma highland agro-forestry.',
    },
    totalKgSold: {
      type: Number,
      default: 0,
    },
    averageQualityScore: {
      type: Number,
      default: 85,
    },
    qualityRank: {
      type: Number,
      default: 1,
    },
    numberCompletedTrades: {
      type: Number,
      default: 0,
    },
    averageRatingFromBuyers: {
      type: Number,
      default: 4.8,
    },
    totalRatingPoints: {
      type: Number,
      default: 4.8,
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

export const FarmerProfile = mongoose.model<IFarmerProfile>('FarmerProfile', FarmerProfileSchema);
