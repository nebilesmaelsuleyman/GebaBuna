import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  trade: mongoose.Types.ObjectId;
  reviewer: mongoose.Types.ObjectId; // User who is giving the review
  reviewee: mongoose.Types.ObjectId; // User being reviewed
  reviewerRole: 'farmer' | 'buyer';
  rating: number; // 1 - 5 stars
  comment: string;
  // Specific Report Card attributes from Buyer about Farmer
  gradePromised?: string;
  gradeDelivered?: string;
  qualityMatchScore?: number; // 0 - 100 (100 if delivered == promised, 80 if 1 grade diff, etc.)
  moistureNotes?: string;
  defectNotes?: string;
  deliveredOnTime?: boolean;
  // Specific Report Card attributes from Farmer about Buyer
  pricePaidPerKg?: number;
  marketPriceBenchmark?: number;
  fairnessRatio?: number; // (pricePaid / marketPrice) * 100
  fairnessMatchScore?: number; // 0 - 100 capped
  paidOnTime?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    trade: {
      type: Schema.Types.ObjectId,
      ref: 'Trade',
      required: true,
      index: true,
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewerRole: {
      type: String,
      enum: ['farmer', 'buyer'],
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    gradePromised: { type: String },
    gradeDelivered: { type: String },
    qualityMatchScore: { type: Number, min: 0, max: 100 },
    moistureNotes: { type: String, default: '' },
    defectNotes: { type: String, default: '' },
    deliveredOnTime: { type: Boolean, default: true },
    pricePaidPerKg: { type: Number },
    marketPriceBenchmark: { type: Number },
    fairnessRatio: { type: Number },
    fairnessMatchScore: { type: Number, min: 0, max: 100 },
    paidOnTime: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// One review per party per trade
ReviewSchema.index({ trade: 1, reviewer: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
