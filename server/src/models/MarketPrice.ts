import mongoose, { Schema, Document } from 'mongoose';

export type CoffeeGrade = 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Specialty';
export type ProcessingType = 'washed' | 'natural';

export interface IPriceHistoryPoint {
  date: Date;
  pricePerKgETB: number;
  sourceNote?: string;
}

export interface IMarketPrice extends Document {
  coffeeType: string; // e.g. "Jimma Washed G1", "Jimma Natural G2", "Limmu Washed G1"
  processing: ProcessingType;
  grade: CoffeeGrade;
  currentPricePerKgETB: number;
  floorPricePerKgETB: number;
  ceilingPricePerKgETB: number;
  currency: string; // 'ETB'
  lastUpdated: Date;
  updatedBy?: mongoose.Types.ObjectId;
  source: string; // e.g. "ECX Daily Closing", "Sample Benchmark"
  history: IPriceHistoryPoint[];
  // NOTE: In production, plug in real ECX API or Reuters/ICO coffee price feed here
}

const MarketPriceSchema = new Schema<IMarketPrice>(
  {
    coffeeType: {
      type: String,
      required: true,
      trim: true,
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
    currentPricePerKgETB: {
      type: Number,
      required: true,
    },
    floorPricePerKgETB: {
      type: Number,
      required: true,
    },
    ceilingPricePerKgETB: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    source: {
      type: String,
      default: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal)',
    },
    history: [
      {
        date: { type: Date, default: Date.now },
        pricePerKgETB: { type: Number, required: true },
        sourceNote: { type: String, default: 'ECX Jimma Official Session' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

MarketPriceSchema.index({ processing: 1, grade: 1 }, { unique: true });

export const MarketPrice = mongoose.model<IMarketPrice>('MarketPrice', MarketPriceSchema);
