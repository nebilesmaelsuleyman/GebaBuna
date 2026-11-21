export type Role = 'farmer' | 'buyer' | 'admin';
export type PreferredLanguage = 'om' | 'am' | 'en';
export const ECX_COFFEE_GRADES = [
  'Washed G1', 'Washed G2', 'Washed G3', 'Washed G4', 'Washed G5',
  'Natural G1', 'Natural G2', 'Natural G3', 'Natural G4', 'Natural G5',
  'Specialty Q1', 'Specialty Q2', 'Under Grade',
] as const;
export type CoffeeGrade = (typeof ECX_COFFEE_GRADES)[number];
export type ProcessingType = 'washed' | 'natural' | 'honey' | 'anaerobic';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'cancelled';
export type TradeStatus = 'pending' | 'escrow' | 'in_transit' | 'inspected' | 'completed' | 'disputed' | 'cancelled';

export interface User {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: Role;
  preferredLanguage: PreferredLanguage;
  avatar?: string;
}

export interface FarmerProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  photo?: string;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  farmSizeHectares: number;
  coffeeVarieties: string[];
  processingMethods: ProcessingType[];
  certifications?: string[];
  shortBio?: string;
  numberOfTrees?: number;
  cooperativeMembership?: string;
  estimatedCostPerKg?: number;
  averageQualityScore: number;
  qualityRank: number;
  totalKgSold: number;
  numberCompletedTrades: number;
  averageRatingFromBuyers: number;
  badge?: 'Gold' | 'Silver' | 'Bronze' | 'Verified Farmer';
}

export interface BuyerProfile {
  id: string;
  userId: string;
  companyName: string;
  ownerName: string;
  phone: string;
  email: string;
  logo?: string;
  businessType: 'exporter' | 'cooperative_union' | 'roaster' | 'local_trader';
  tradeLicenseNumber: string;
  tinNumber: string;
  verificationStatus: VerificationStatus | 'unverified' | 'suspended';
  region?: string;
  zone?: string;
  address?: string;
  exportLicenseNumber?: string;
  yearsInBusiness?: number;
  preferredCoffeeTypes?: string[];
  preferredVolumes?: string;
  uploadedDocuments?: Array<{ title: string; fileUrl: string; docType: string; uploadedAt: string }>;
  rejectionReason?: string;
  adminNotes?: string;
  fairnessScore: number;
  fairnessRank: number;
  totalKgBought: number;
  totalOffersMade: number;
  totalOffersAboveFloor: number;
  numberCompletedTrades: number;
  averageRatingFromFarmers: number;
  licenseDocumentUrl?: string;
}

export interface MarketPriceHistory {
  date: string;
  pricePerKgETB: number;
}

export interface MarketPrice {
  _id: string;
  coffeeType: string;
  processing: ProcessingType;
  grade: CoffeeGrade;
  currentPricePerKgETB: number;
  floorPricePerKgETB: number;
  ceilingPricePerKgETB: number;
  source: string;
  lastUpdated: string;
  history: MarketPriceHistory[];
}

export interface Listing {
  _id: string;
  farmer: {
    _id: string;
    fullName: string;
    phone: string;
    avatar?: string;
  };
  farmerProfile?: {
    _id: string;
    averageQualityScore: number;
    woreda: string;
    badge?: string;
  };
  title: string;
  variety: string;
  grade: CoffeeGrade;
  processing: ProcessingType;
  harvestYear: number;
  quantityKg: number;
  askingPricePerKg: number;
  minimumAcceptablePrice?: number;
  location: {
    region: string;
    zone: string;
    woreda: string;
    kebele: string;
  };
  cuppingScore?: number;
  moisturePercentage?: number;
  certifications: string[];
  photos: string[];
  status: 'open' | 'under_offer' | 'sold' | 'cancelled';
  marketReferencePrice: number;
  priceDiffPercentage: number;
  isFairPrice: boolean;
  notes?: string;
  createdAt: string;
}

export interface Offer {
  _id: string;
  listing: Listing | string;
  buyer: {
    _id: string;
    fullName: string;
    phone: string;
    email: string;
  };
  buyerProfile?: {
    companyName: string;
    businessType: string;
    fairnessScore: number;
    verificationStatus: string;
  };
  farmer: {
    _id: string;
    fullName: string;
    phone: string;
  };
  offeredPricePerKg: number;
  offeredQuantityKg: number;
  totalAmountETB: number;
  marketReferencePrice: number;
  isFairOffer: boolean;
  fairnessIndicator: 'above_market' | 'fair_market' | 'below_floor';
  status: OfferStatus;
  proposedPaymentTerms: string;
  proposedDeliveryLocation: string;
  farmerResponseNote?: string;
  createdAt: string;
}

export interface Trade {
  _id: string;
  tradeReference: string;
  listing: Listing;
  farmer: User;
  buyer: User;
  farmerProfile?: FarmerProfile;
  buyerProfile?: BuyerProfile;
  agreedPricePerKg: number;
  agreedQuantityKg: number;
  totalAmountETB: number;
  marketReferencePrice: number;
  priceVersusMarketPct: number;
  status: TradeStatus;
  contractDate: string;
  settlementDate?: string;
  deliveryLocation: string;
  farmerReviewedBuyer: boolean;
  buyerReviewedFarmer: boolean;
  reportCard: {
    priceFairnessGrade: 'A+' | 'A' | 'B' | 'C' | 'F';
    premiumOverFloorETB: number;
    paymentTimelinessScore: number;
    notes: string;
  };
  createdAt: string;
}

export interface AdminStats {
  totalFarmers: number;
  totalBuyers: number;
  pendingVerifications: number;
  totalListings: number;
  completedTrades: number;
  totalKgTraded: number;
  totalETBValue: number;
  avgPricePaid: number;
  avgMarketPrice: number;
  fairnessRatioOverall: number;
  flaggedBuyersCount: number;
}
