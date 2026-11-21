import mongoose, { Schema, Document } from 'mongoose';
import { DeliveryTerm } from './Offer';

export type TradeStatus = 'agreed' | 'delivered' | 'paid' | 'completed' | 'cancelled';

export interface ITrade extends Document {
  listing: mongoose.Types.ObjectId;
  offer: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  buyer: mongoose.Types.ObjectId;
  agreedPricePerKg: number;
  agreedQuantityKg: number;
  totalAmountETB: number;
  marketReferencePrice: number;
  deliveryTerms: DeliveryTerm;
  status: TradeStatus;
  // Delivery step confirmation
  deliveryConfirmedByFarmer: boolean;
  deliveryConfirmedByBuyer: boolean;
  deliveryConfirmedAt?: Date;
  deliveryNotes?: string;
  // Payment step confirmation (Telebirr/CBE Birr integration placeholder)
  paymentConfirmedByFarmer: boolean;
  paymentConfirmedByBuyer: boolean;
  paymentConfirmedAt?: Date;
  paymentNotes?: string;
  paymentMethod: 'cash_at_warehouse' | 'bank_transfer_cbe' | 'telebirr' | 'escrow_placeholder';
  // Review flags
  reviewSubmittedByFarmer: boolean;
  reviewSubmittedByBuyer: boolean;
  completedAt?: Date;
  // Bilateral report card (fairness + quality scores)
  reportCard?: {
    priceFairnessGrade: 'A+' | 'A' | 'B' | 'C' | 'F';
    premiumOverFloorETB: number;
    paymentTimelinessScore: number;
    notes: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TradeSchema = new Schema<ITrade>(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      required: true,
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
    agreedPricePerKg: {
      type: Number,
      required: true,
    },
    agreedQuantityKg: {
      type: Number,
      required: true,
    },
    totalAmountETB: {
      type: Number,
      required: true,
    },
    marketReferencePrice: {
      type: Number,
      required: true,
    },
    deliveryTerms: {
      type: String,
      enum: ['buyer_pickup', 'farmer_delivery', 'cooperative_warehouse'],
      default: 'buyer_pickup',
    },
    status: {
      type: String,
      enum: ['agreed', 'delivered', 'paid', 'completed', 'cancelled'],
      default: 'agreed',
      index: true,
    },
    deliveryConfirmedByFarmer: {
      type: Boolean,
      default: false,
    },
    deliveryConfirmedByBuyer: {
      type: Boolean,
      default: false,
    },
    deliveryConfirmedAt: {
      type: Date,
    },
    deliveryNotes: {
      type: String,
      default: '',
    },
    paymentConfirmedByFarmer: {
      type: Boolean,
      default: false,
    },
    paymentConfirmedByBuyer: {
      type: Boolean,
      default: false,
    },
    paymentConfirmedAt: {
      type: Date,
    },
    paymentNotes: {
      type: String,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: ['cash_at_warehouse', 'bank_transfer_cbe', 'telebirr', 'escrow_placeholder'],
      default: 'bank_transfer_cbe',
    },
    reviewSubmittedByFarmer: {
      type: Boolean,
      default: false,
    },
    reviewSubmittedByBuyer: {
      type: Boolean,
      default: false,
    },
    // Bilateral report card (fairness + quality scores)
    reportCard: {
      priceFairnessGrade: {
        type: String,
        enum: ['A+', 'A', 'B', 'C', 'F'],
      },
      premiumOverFloorETB: {
        type: Number,
        default: 0,
      },
      paymentTimelinessScore: {
        type: Number,
        default: 85,
      },
      notes: {
        type: String,
        default: '',
      },
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Trade = mongoose.model<ITrade>('Trade', TradeSchema);
