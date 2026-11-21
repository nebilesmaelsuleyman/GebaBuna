import mongoose, { Schema, Document } from 'mongoose';
import { PriceFairnessStatus } from './Listing';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
export type DeliveryTerm = 'buyer_pickup' | 'farmer_delivery' | 'cooperative_warehouse';

export interface IOffer extends Document {
  listing: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  buyer: mongoose.Types.ObjectId;
  buyerProfile?: mongoose.Types.ObjectId;
  offeredPricePerKg: number;
  quantityKg: number;
  totalPriceETB: number;
  message?: string;
  deliveryTerms: DeliveryTerm;
  status: OfferStatus;
  // Counter-offer fields
  counterPricePerKg?: number;
  counterQuantityKg?: number;
  counterMessage?: string;
  counteredBy?: 'farmer' | 'buyer';
  counteredAt?: Date;
  // Fairness vs ECX benchmark
  marketPriceAtOffer: number;
  priceFairnessDiff: number;
  fairnessPercentage: number;
  fairnessStatus: PriceFairnessStatus;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    farmer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyerProfile: {
      type: Schema.Types.ObjectId,
      ref: 'BuyerProfile',
    },
    offeredPricePerKg: {
      type: Number,
      required: true,
      min: 1,
    },
    quantityKg: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPriceETB: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    deliveryTerms: {
      type: String,
      enum: ['buyer_pickup', 'farmer_delivery', 'cooperative_warehouse'],
      default: 'buyer_pickup',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'countered', 'withdrawn'],
      default: 'pending',
      index: true,
    },
    counterPricePerKg: {
      type: Number,
    },
    counterQuantityKg: {
      type: Number,
    },
    counterMessage: {
      type: String,
    },
    counteredBy: {
      type: String,
      enum: ['farmer', 'buyer'],
    },
    counteredAt: {
      type: Date,
    },
    marketPriceAtOffer: {
      type: Number,
      required: true,
    },
    priceFairnessDiff: {
      type: Number,
      required: true,
    },
    fairnessPercentage: {
      type: Number,
      required: true,
    },
    fairnessStatus: {
      type: String,
      enum: ['fair', 'low', 'very_low'],
      default: 'fair',
    },
  },
  {
    timestamps: true,
  }
);

export const Offer = mongoose.model<IOffer>('Offer', OfferSchema);
