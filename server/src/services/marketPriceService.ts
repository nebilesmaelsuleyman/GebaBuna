/**
 * ☕ MARKET PRICE REFERENCE SERVICE
 * -------------------------------------------------------------
 * Evaluates whether asking prices and buyer offers are fair or predatory.
 * Compares against ECX (Ethiopian Commodity Exchange) reference data.
 *
 * Primary source: live internet fetch from ECX / international coffee feeds.
 * Fallback: MongoDB cached prices → hardcoded defaults.
 */

import { MarketPrice, CoffeeGrade, ProcessingType } from '../models/MarketPrice';
import { PriceFairnessStatus } from '../models/Listing';
import { getLiveMarketReferencePrice } from './ecxPriceService';

export interface PriceFairnessAnalysis {
  marketPrice: number;
  diff: number; // asking/offered - market
  percentageOfMarket: number;
  status: PriceFairnessStatus;
  label: string;
  adviceMessage: string;
  source: string;
  isLive: boolean;
}

/**
 * Get the current ECX reference price per kg for a given processing + grade.
 * Tries live internet first, then MongoDB cache, then hardcoded defaults.
 */
export async function getMarketReferencePrice(
  processing: ProcessingType,
  grade: CoffeeGrade
): Promise<number> {
  const result = await getLiveMarketReferencePrice(processing, grade);
  return result.price;
}

export async function getMarketReferencePriceWithSource(
  processing: ProcessingType,
  grade: CoffeeGrade
): Promise<{ price: number; source: string; isLive: boolean }> {
  return getLiveMarketReferencePrice(processing, grade);
}

export function evaluatePriceFairness(
  price: number,
  marketReferencePrice: number
): PriceFairnessAnalysis {
  const diff = price - marketReferencePrice;
  const percentage = marketReferencePrice > 0 ? (price / marketReferencePrice) * 100 : 100;
  const roundedPercentage = Math.round(percentage * 10) / 10;

  let status: PriceFairnessStatus = 'fair';
  let label = 'Fair Price';
  let adviceMessage = 'This price aligns with or exceeds the current Jimma ECX market benchmark.';

  if (percentage < 75) {
    status = 'very_low';
    label = 'Very Low (Predatory)';
    adviceMessage = `Warning: This is ${Math.abs(diff)} ETB/kg below market benchmark (${roundedPercentage}% of ECX value). Do not undersell!`;
  } else if (percentage < 90) {
    status = 'low';
    label = 'Below Market';
    adviceMessage = `Notice: This is ${Math.abs(diff)} ETB/kg below the current ECX reference rate (${roundedPercentage}% of ECX value). Consider asking for a higher price.`;
  } else {
    status = 'fair';
    label = 'Fair Market Price';
    adviceMessage = `Fair trade! Offered/asked price is within ${roundedPercentage}% of Jimma market benchmark (+${diff >= 0 ? diff : 0} ETB/kg).`;
  }

  return {
    marketPrice: marketReferencePrice,
    diff,
    percentageOfMarket: roundedPercentage,
    status,
    label,
    adviceMessage,
    source: 'ECX',
    isLive: true,
  };
}

export function evaluatePriceFairnessWithSource(
  price: number,
  marketReferencePrice: number,
  source: string,
  isLive: boolean
): PriceFairnessAnalysis {
  const base = evaluatePriceFairness(price, marketReferencePrice);
  return {
    ...base,
    source,
    isLive,
  };
}
