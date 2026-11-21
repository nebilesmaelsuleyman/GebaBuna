export type Role = 'farmer' | 'buyer' | 'admin';
export type PreferredLanguage = 'om' | 'am' | 'en';
export const ECX_COFFEE_GRADES = [
  'Washed G1', 'Washed G2', 'Washed G3', 'Washed G4', 'Washed G5',
  'Natural G1', 'Natural G2', 'Natural G3', 'Natural G4', 'Natural G5',
  'Specialty Q1', 'Specialty Q2', 'Under Grade',
] as const;
// Grades stored by the API (MarketPrice/Listing) use the short form, e.g. "Grade 1".
export const MARKET_GRADES = ['Specialty', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] as const;
export type CoffeeGrade = (typeof ECX_COFFEE_GRADES)[number] | (typeof MARKET_GRADES)[number];
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

export interface NegotiationTurn {
  round: number;
  senderRole: 'farmer' | 'buyer';
  senderId?: string;
  senderName: string;
  action: 'initial_offer' | 'counter_offer' | 'accepted' | 'rejected';
  pricePerKg: number;
  quantityKg: number;
  totalAmountETB: number;
  message?: string;
  createdAt: string;
}

export interface Offer {
  _id: string;
  listing: Listing | any;
  buyer: {
    _id: string;
    fullName: string;
    phone: string;
    email: string;
    avatar?: string;
  };
  buyerProfile?: {
    _id?: string;
    companyName: string;
    businessType: string;
    fairnessScore: number;
    fairnessRank?: number;
    verificationStatus: string;
    averageRatingFromFarmers?: number;
  };
  farmer: {
    _id: string;
    fullName: string;
    phone: string;
    avatar?: string;
  };
  offeredPricePerKg: number;
  quantityKg?: number;
  offeredQuantityKg?: number;
  totalPriceETB?: number;
  totalAmountETB?: number;
  marketReferencePrice?: number;
  marketPriceAtOffer?: number;
  isFairOffer?: boolean;
  fairnessStatus?: string;
  fairnessPercentage?: number;
  fairnessIndicator?: 'above_market' | 'fair_market' | 'below_floor';
  status: OfferStatus;
  // Multi-round negotiation fields (max 3 rounds)
  round?: number;
  maxRounds?: number;
  currentTurn?: 'farmer' | 'buyer';
  currentPricePerKg?: number;
  currentQuantityKg?: number;
  lastActionBy?: 'farmer' | 'buyer';
  negotiationHistory?: NegotiationTurn[];
  // Counter-offer fields
  counterPricePerKg?: number;
  counterQuantityKg?: number;
  counterMessage?: string;
  counteredBy?: 'farmer' | 'buyer';
  counteredAt?: string;
  message?: string;
  deliveryTerms?: string;
  proposedPaymentTerms?: string;
  proposedDeliveryLocation?: string;
  farmerResponseNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BilateralSummary {
  totalTradesCount: number;
  completedTradesCount: number;
  totalKgTraded: number;
  totalETBTraded: number;
  averagePricePerKg: number;
  lastTradeDate: string | null;
  isEstablishedPartner: boolean;
}

export interface TraceabilityData {
  user: {
    _id: string;
    fullName: string;
    role: Role;
    avatar?: string;
    phone?: string;
    email?: string;
    createdAt: string;
  };
  profile: (FarmerProfile & BuyerProfile) | any;
  traceability: {
    totalTradesCount: number;
    completedTradesCount: number;
    totalKgTraded: number;
    totalETBTraded: number;
    completedTrades: any[];
  };
  bilateral: BilateralSummary;
  bilateralTrades: any[];
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

export interface PublicStats {
  farmers: number;
  buyers: number;
  openListings: number;
  settledTrades: number;
  kgTraded: number;
  etbPaid: number;
  premiumOverReferencePct: number | null;
  averageBuyerFairness: number | null;
}

export interface AdminStats {
  totalFarmers: number;
  totalBuyers: number;
  verifiedBuyers?: number;
  removedUsers?: number;
  pendingVerifications: number;
  totalListings: number;
  openListings?: number;
  openKgListed?: number;
  openOffers?: number;
  tradesInProgress?: number;
  completedTrades: number;
  totalKgTraded: number;
  totalETBValue: number;
  avgPricePaid: number;
  avgMarketPrice: number;
  fairnessRatioOverall: number;
  flaggedBuyersCount: number;
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  removedAt?: string;
  removedReason?: string;
  joinedAt: string;
  settledTrades: number;
  kgTraded: number;
  etbTraded: number;
  premiumOverReferencePct: number | null;
  tradesInProgress: number;
  openOffers: number;
  // Farmers
  woreda?: string;
  kebele?: string;
  cooperative?: string;
  farmSizeHectares?: number;
  qualityScore?: number;
  qualityRank?: number;
  openListings?: number;
  openKgListed?: number;
  // Buyers
  buyerProfileId?: string;
  companyName?: string;
  businessType?: string;
  tradeLicenseNumber?: string;
  tinNumber?: string;
  verificationStatus?: string;
  fairnessScore?: number;
  averageRatingFromFarmers?: number;
}

export interface AdminTradeRow {
  id: string;
  status: string;
  farmerName: string;
  buyerName: string;
  coffeeType?: string;
  processing?: string;
  grade?: string;
  woreda?: string;
  quantityKg: number;
  pricePerKg: number;
  referencePricePerKg: number;
  totalETB: number;
  paymentMethod?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AdminAuditEntry {
  _id: string;
  admin?: { fullName: string };
  action: 'user_removed' | 'user_restored' | 'buyer_approved' | 'buyer_rejected' | 'buyer_suspended';
  targetRole: string;
  targetName: string;
  reason: string;
  details?: Record<string, unknown>;
  createdAt: string;
}
