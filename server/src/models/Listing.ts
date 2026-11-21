import mongoose, { Schema, Document } from 'mongoose';
import { CoffeeGrade, ProcessingType } from './MarketPrice';

export type ListingStatus = 'open' | 'in_negotiation' | 'sold' | 'cancelled';
export type ListingSource = 'web' | 'telegram';
export type PriceFairnessStatus = 'fair' | 'low' | 'very_low';

export interface IListingLocation {
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
}

export interface IListing extends Document {
  farmer: mongoose.Types.ObjectId;
  farmerProfile?: mongoose.Types.ObjectId;
  coffeeType: string;
  processing: ProcessingType;
  grade: CoffeeGrade;
  quantityKg: number;
  askingPricePerKg: number;
  harvestDate: string;
  location: IListingLocation;
  photos: string[];
  description: string;
  source: ListingSource;
  status: ListingStatus;
  moisturePercentage: number;
  // Optional AI coffee grader estimation fields
  aiEstimatedGrade?: string;
  aiConfidence?: string;
  aiDefectsSummary?: string;
  // Price benchmark snapshots
  marketReferencePrice: number;
  priceFairnessDiff: number;
  priceFairnessStatus: PriceFairnessStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    farmerProfile: {
      type: Schema.Types.ObjectId,
      ref: 'FarmerProfile',
    },
    coffeeType: {
      type: String,
      required: true,
      trim: true,
      default: 'Jimma Specialty Heirloom',
    },
    processing: {
      type: String,
      enum: ['washed', 'natural'],
      required: true,
    },
    grade: {
      type: String,
      enum: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Specialty'],
      required: true,
    },
    quantityKg: {
      type: Number,
      required: true,
      min: 1,
    },
    askingPricePerKg: {
      type: Number,
      required: true,
      min: 1,
    },
    harvestDate: {
      type: String,
      required: true,
      default: 'November 2024 / Tahsas 2017',
    },
    location: {
      region: { type: String, default: 'Oromia' },
      zone: { type: String, default: 'Jimma' },
      woreda: { type: String, required: true },
      kebele: { type: String, required: true },
    },
    photos: {
      type: [String],
      validate: [(val: string[]) => val.length <= 4, '{PATH} exceeds limit of 4 photos'],
      default: [],
    },
    description: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      enum: ['web', 'telegram'],
      default: 'web',
    },
    status: {
      type: String,
      enum: ['open', 'in_negotiation', 'sold', 'cancelled'],
      default: 'open',
      index: true,
    },
    moisturePercentage: {
      type: Number,
      default: 11.5,
      min: 8,
      max: 18,
    },
    aiEstimatedGrade: {
      type: String,
      default: '',
    },
    aiConfidence: {
      type: String,
      default: '',
    },
    aiDefectsSummary: {
      type: String,
      default: '',
    },
    marketReferencePrice: {
      type: Number,
      required: true,
      default: 720,
    },
    priceFairnessDiff: {
      type: Number,
      default: 0,
    },
    priceFairnessStatus: {
      type: String,
      enum: ['fair', 'low', 'very_low'],
      default: 'fair',
    },
  },
  {
    timestamps: true,
  }
);

ListingSchema.index({ status: 1, grade: 1, processing: 1, askingPricePerKg: 1 });

export const Listing = mongoose.model<IListing>('Listing', ListingSchema);
