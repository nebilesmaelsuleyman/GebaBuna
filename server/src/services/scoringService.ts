/**
 * ☕ BUNA FAIR PRICE - SCORING ENGINE
 * -------------------------------------------------------------
 * Transparent, weighted scoring algorithms for Ethiopian coffee farmers and buyers.
 * Designed for the Cursor Hackathon (Jimma University).
 * 
 * FARMER RANKING SCORE (0 - 100): see FARMER_RANKING_WEIGHTS below
 * (grade fidelity, ECX grade level, buyer rating, on-time delivery,
 * moisture compliance, track record).
 * 
 * BUYER FAIRNESS SCORE (0 - 100):
 * - 50% Price Paid vs. ECX Market Reference Price (Fairness ratio capped at 100)
 * - 30% Farmer Star Ratings (Normalized 1-5 stars -> 0-100)
 * - 20% On-Time Payment reliability
 * 
 * Buyers with Fairness Score >= 85 earn the "Fair Buyer" gold badge.
 */

import { FarmerProfile } from '../models/FarmerProfile';
import { BuyerProfile } from '../models/BuyerProfile';
import { Review } from '../models/Review';
import { Listing } from '../models/Listing';
import mongoose from 'mongoose';

/**
 * Grade numerical mapping to calculate quality match penalty
 */
const GRADE_NUMERIC: Record<string, number> = {
  Specialty: 1,
  'Grade 1': 1,
  'Grade 2': 2,
  'Grade 3': 3,
  'Grade 4': 4,
  'Grade 5': 5,
};

/**
 * Computes single-trade quality match score (0 - 100)
 */
export function calculateQualityMatch(promised: string, delivered: string): number {
  const pVal = GRADE_NUMERIC[promised] || 3;
  const dVal = GRADE_NUMERIC[delivered] || 3;
  const diff = Math.abs(pVal - dVal);

  if (diff === 0) return 100;
  if (diff === 1) return 80;
  if (diff === 2) return 60;
  if (diff === 3) return 40;
  return 20;
}

/**
 * Computes single-trade fairness score (0 - 100)
 * If buyer pays at or above ECX reference price, fairness = 100.
 * If buyer pays 80% of reference price, fairness = 80.
 */
export function calculateFairnessMatch(paidPrice: number, marketReferencePrice: number): {
  fairnessRatio: number;
  fairnessMatchScore: number;
} {
  if (marketReferencePrice <= 0) {
    return { fairnessRatio: 100, fairnessMatchScore: 100 };
  }
  const ratio = (paidPrice / marketReferencePrice) * 100;
  // Cap at 100 for score calculation, but keep raw ratio for stats
  const score = Math.min(100, Math.max(0, Math.round(ratio)));
  return {
    fairnessRatio: Math.round(ratio * 10) / 10,
    fairnessMatchScore: score,
  };
}

/**
 * FARMER RANKING CRITERIA (0 - 100), aligned with ECX/ECTA grading practice.
 *
 * | Criterion            | Weight | How it is measured                                              |
 * |----------------------|--------|-----------------------------------------------------------------|
 * | Grade fidelity       | 30%    | Buyer-verified delivered grade vs grade promised on the listing |
 * | ECX grade level      | 20%    | Average ECX total-score midpoint of the farmer's lots           |
 * |                      |        | (Specialty 95, G1 93, G2 85, G3 75, G4 66, G5 60)               |
 * | Buyer rating         | 20%    | Average 1-5 stars from buyers, scaled to 0-100                  |
 * | On-time delivery     | 15%    | Share of trades delivered on the agreed date                    |
 * | Moisture compliance  | 10%    | Share of lots at or below the ECX 11.5% moisture limit          |
 * | Track record         | 5%     | Completed trades (10 trades = full marks)                       |
 *
 * Farmers with no reviews yet use neutral defaults (70) for the buyer-dependent
 * criteria, so new farmers start mid-table and move up as buyers verify them.
 * Ties are broken by total kg sold.
 */
export const FARMER_RANKING_WEIGHTS = {
  gradeFidelity: 0.3,
  gradeLevel: 0.2,
  buyerRating: 0.2,
  onTimeDelivery: 0.15,
  moistureCompliance: 0.1,
  trackRecord: 0.05,
} as const;

const ECX_GRADE_SCORE: Record<string, number> = {
  Specialty: 95,
  'Grade 1': 93,
  'Grade 2': 85,
  'Grade 3': 75,
  'Grade 4': 66,
  'Grade 5': 60,
};

const MAX_MOISTURE_PERCENT = 11.5;
const NEUTRAL_SCORE = 70;

export interface FarmerRankingBreakdown {
  gradeFidelity: number;
  gradeLevel: number;
  buyerRating: number;
  onTimeDelivery: number;
  moistureCompliance: number;
  trackRecord: number;
  total: number;
}

const average = (values: number[], fallback: number) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

/**
 * Recalculates and persists a Farmer's ranking score and its per-criterion breakdown
 */
export async function recalculateFarmerScore(
  farmerUserId: mongoose.Types.ObjectId,
  options: { refreshRanks?: boolean } = {}
): Promise<number> {
  const profile = await FarmerProfile.findOne({ user: farmerUserId });
  if (!profile) return NEUTRAL_SCORE;

  const [reviews, listings] = await Promise.all([
    Review.find({ reviewee: farmerUserId, reviewerRole: 'buyer' }),
    Listing.find({ farmer: farmerUserId }).select('grade moisturePercentage'),
  ]);

  const breakdown: Omit<FarmerRankingBreakdown, 'total'> = {
    gradeFidelity: average(reviews.map((r) => r.qualityMatchScore ?? 85), NEUTRAL_SCORE),
    gradeLevel: average(listings.map((l) => ECX_GRADE_SCORE[l.grade] ?? 66), NEUTRAL_SCORE),
    buyerRating: average(reviews.map((r) => (r.rating / 5) * 100), NEUTRAL_SCORE),
    onTimeDelivery: average(reviews.map((r) => (r.deliveredOnTime === false ? 0 : 100)), NEUTRAL_SCORE),
    moistureCompliance: average(
      listings.map((l) => ((l.moisturePercentage ?? MAX_MOISTURE_PERCENT) <= MAX_MOISTURE_PERCENT ? 100 : 0)),
      NEUTRAL_SCORE
    ),
    trackRecord: Math.min(100, (profile.numberCompletedTrades || 0) * 10),
  };

  const total = Math.round(
    (Object.keys(FARMER_RANKING_WEIGHTS) as Array<keyof typeof FARMER_RANKING_WEIGHTS>).reduce(
      (sum, key) => sum + breakdown[key] * FARMER_RANKING_WEIGHTS[key],
      0
    )
  );

  const rounded = Object.fromEntries(
    Object.entries(breakdown).map(([key, value]) => [key, Math.round(value)])
  ) as Omit<FarmerRankingBreakdown, 'total'>;

  profile.averageQualityScore = total;
  profile.rankingBreakdown = { ...rounded, total };
  if (reviews.length) {
    const totalStars = reviews.reduce((sum, r) => sum + r.rating, 0);
    profile.averageRatingFromBuyers = Math.round((totalStars / reviews.length) * 10) / 10;
    profile.ratingCount = reviews.length;
    profile.totalRatingPoints = totalStars;
  }
  await profile.save();

  if (options.refreshRanks !== false) {
    await refreshFarmerRanks();
  }

  return total;
}

/** Recalculates every farmer's score, then assigns ranks once. */
export async function recalculateAllFarmerScores(): Promise<void> {
  const farmers = await FarmerProfile.find().select('user');
  for (const farmer of farmers) {
    await recalculateFarmerScore(farmer.user, { refreshRanks: false });
  }
  await refreshFarmerRanks();
}

/**
 * Recalculates and persists a Buyer's overall Fairness Score and public stats
 */
export async function recalculateBuyerScore(buyerUserId: mongoose.Types.ObjectId): Promise<number> {
  const reviews = await Review.find({ reviewee: buyerUserId, reviewerRole: 'farmer' });
  const profile = await BuyerProfile.findOne({ user: buyerUserId });

  if (!profile) return 80;

  if (reviews.length === 0) {
    return profile.fairnessScore;
  }

  let totalFairnessComponent = 0;
  let totalRatingComponent = 0;
  let totalOnTimePaymentComponent = 0;
  let totalStars = 0;

  for (const r of reviews) {
    // 1. Price fairness match (0-100)
    const fScore = r.fairnessMatchScore ?? 85;
    totalFairnessComponent += fScore;

    // 2. Rating normalized to 0-100
    const rScore = (r.rating / 5) * 100;
    totalRatingComponent += rScore;
    totalStars += r.rating;

    // 3. On-time payment (100 if true, 40 if false)
    const onTimeScore = r.paidOnTime ? 100 : 40;
    totalOnTimePaymentComponent += onTimeScore;
  }

  const count = reviews.length;
  const avgFairness = totalFairnessComponent / count;
  const avgRatingScore = totalRatingComponent / count;
  const avgOnTime = totalOnTimePaymentComponent / count;

  // Formula: 50% price fairness + 30% farmer star rating + 20% on-time payment
  const finalScore = Math.round(avgFairness * 0.5 + avgRatingScore * 0.3 + avgOnTime * 0.2);
  const avgStars = Math.round((totalStars / count) * 10) / 10;

  profile.fairnessScore = finalScore;
  profile.averageRatingFromFarmers = avgStars;
  profile.ratingCount = count;
  profile.totalRatingPoints = totalStars;
  await profile.save();

  // Re-rank all buyers by fairness score
  await refreshBuyerRanks();

  return finalScore;
}

/**
 * Updates relative quality rank badges for farmers
 */
export async function refreshFarmerRanks(): Promise<void> {
  const farmers = await FarmerProfile.find().sort({ averageQualityScore: -1, totalKgSold: -1 });
  for (let i = 0; i < farmers.length; i++) {
    farmers[i].qualityRank = i + 1;
    await farmers[i].save();
  }
}

/**
 * Updates relative fairness rank badges for buyers
 */
export async function refreshBuyerRanks(): Promise<void> {
  const buyers = await BuyerProfile.find().sort({ fairnessScore: -1, totalKgBought: -1 });
  for (let i = 0; i < buyers.length; i++) {
    buyers[i].fairnessRank = i + 1;
    await buyers[i].save();
  }
}
