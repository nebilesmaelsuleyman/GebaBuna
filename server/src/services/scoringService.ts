/**
 * ☕ BUNA FAIR PRICE - SCORING ENGINE
 * -------------------------------------------------------------
 * Transparent, weighted scoring algorithms for Ethiopian coffee farmers and buyers.
 * Designed for the Cursor Hackathon (Jimma University).
 * 
 * FARMER QUALITY SCORE (0 - 100):
 * - 50% Quality Delivered vs. Grade Promised (Grade matching fidelity)
 * - 30% Buyer Star Ratings (Normalized 1-5 stars -> 0-100)
 * - 20% On-Time Delivery reliability
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
 * Recalculates and persists a Farmer's overall Quality Score and public stats
 */
export async function recalculateFarmerScore(farmerUserId: mongoose.Types.ObjectId): Promise<number> {
  const reviews = await Review.find({ reviewee: farmerUserId, reviewerRole: 'buyer' });
  const profile = await FarmerProfile.findOne({ user: farmerUserId });

  if (!profile) return 80;

  if (reviews.length === 0) {
    return profile.averageQualityScore;
  }

  let totalQualityComponent = 0;
  let totalRatingComponent = 0;
  let totalOnTimeComponent = 0;
  let totalStars = 0;

  for (const r of reviews) {
    // 1. Quality match (0-100)
    const qScore = r.qualityMatchScore ?? 85;
    totalQualityComponent += qScore;

    // 2. Rating normalized to 0-100 (5 stars = 100, 1 star = 20)
    const rScore = (r.rating / 5) * 100;
    totalRatingComponent += rScore;
    totalStars += r.rating;

    // 3. On-time delivery (100 if true, 50 if false)
    const onTimeScore = r.deliveredOnTime ? 100 : 50;
    totalOnTimeComponent += onTimeScore;
  }

  const count = reviews.length;
  const avgQuality = totalQualityComponent / count;
  const avgRatingScore = totalRatingComponent / count;
  const avgOnTime = totalOnTimeComponent / count;

  // Formula: 50% quality match + 30% star rating + 20% on-time delivery
  const finalScore = Math.round(avgQuality * 0.5 + avgRatingScore * 0.3 + avgOnTime * 0.2);
  const avgStars = Math.round((totalStars / count) * 10) / 10;

  profile.averageQualityScore = finalScore;
  profile.averageRatingFromBuyers = avgStars;
  profile.ratingCount = count;
  profile.totalRatingPoints = totalStars;
  await profile.save();

  // Re-rank all farmers by quality score
  await refreshFarmerRanks();

  return finalScore;
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
