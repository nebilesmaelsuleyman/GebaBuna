import mongoose, { Schema, Document } from 'mongoose';
import { PriceFairnessStatus } from './Listing';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
export type DeliveryTerm = 'buyer_pickup' | 'farmer_delivery' | 'cooperative_warehouse';

export interface INegotiationTurn {
  round: number;
  senderRole: 'farmer' | 'buyer';
  senderId?: mongoose.Types.ObjectId;
  senderName: string;
  action: 'initial_offer' | 'counter_offer' | 'accepted' | 'rejected';
  pricePerKg: number;
  quantityKg: number;
  totalAmountETB: number;
  message?: string;
  createdAt: Date;
}

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
  // Multi-round negotiation fields (max 3 rounds)
  round: number;
  maxRounds: number;
  currentTurn: 'farmer' | 'buyer';
  currentPricePerKg: number;
  currentQuantityKg: number;
  lastActionBy?: 'farmer' | 'buyer';
  negotiationHistory: INegotiationTurn[];
  // Legacy / convenience counter-offer fields
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
    // Multi-round negotiation fields (max 3 rounds)
    round: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
    maxRounds: {
      type: Number,
      default: 3,
    },
    currentTurn: {
      type: String,
      enum: ['farmer', 'buyer'],
      default: 'farmer',
    },
    currentPricePerKg: {
      type: Number,
    },
    currentQuantityKg: {
      type: Number,
    },
    lastActionBy: {
      type: String,
      enum: ['farmer', 'buyer'],
    },
    negotiationHistory: [
      {
        round: { type: Number, required: true },
        senderRole: { type: String, enum: ['farmer', 'buyer'], required: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User' },
        senderName: { type: String, required: true },
        action: {
          type: String,
          enum: ['initial_offer', 'counter_offer', 'accepted', 'rejected'],
          required: true,
        },
        pricePerKg: { type: Number, required: true },
        quantityKg: { type: Number, required: true },
        totalAmountETB: { type: Number, required: true },
        message: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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
