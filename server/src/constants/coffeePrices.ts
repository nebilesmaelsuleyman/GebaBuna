/**
 * Estimated Jimma green-coffee reference prices, ETB per kg (2025/26 harvest).
 *
 * These are estimates, not live ECX quotes. They are derived from:
 * - ECTA minimum export floors, Oct 2026: Jimma/Limu G1 about US$8.1–8.3/kg,
 *   G2 about US$7.9/kg (kaffabridge.co.uk/floor-prices, tbx.et/prices).
 * - Jimma FOB ranges 2025/26: G4 natural US$2.50–3.20/lb, G5 US$2.00–2.80/lb
 *   (ethiocoffee.co Jimma sourcing guide).
 * - Farm-gate red cherry 120–185 ETB/kg, about 6 kg cherry per 1 kg green
 *   (Sucafina 2025/26 harvest update).
 * - Exchange rate assumption: 1 USD ≈ 155 ETB.
 *
 * "current" is a fair local supplier price for green coffee at Jimma, which
 * sits below the export floor to leave room for export costs.
 * "floor" is the minimum a verified buyer may offer on this platform (floorFor(current), 93%).
 */

export type ReferenceGrade = 'Specialty' | 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5';
export type ReferenceProcessing = 'washed' | 'natural';

export interface ReferencePrice {
  current: number;
  floor: number;
  ceiling: number;
}

export const REFERENCE_PRICES: Record<ReferenceProcessing, Record<ReferenceGrade, ReferencePrice>> = {
  washed: {
    Specialty: { current: 1260, floor: 1170, ceiling: 1380 },
    'Grade 1': { current: 1150, floor: 1070, ceiling: 1250 },
    'Grade 2': { current: 1040, floor: 965, ceiling: 1130 },
    'Grade 3': { current: 900, floor: 835, ceiling: 980 },
    'Grade 4': { current: 790, floor: 735, ceiling: 860 },
    'Grade 5': { current: 680, floor: 630, ceiling: 740 },
  },
  natural: {
    Specialty: { current: 1200, floor: 1115, ceiling: 1310 },
    'Grade 1': { current: 1080, floor: 1005, ceiling: 1170 },
    'Grade 2': { current: 960, floor: 895, ceiling: 1040 },
    'Grade 3': { current: 830, floor: 770, ceiling: 900 },
    'Grade 4': { current: 720, floor: 670, ceiling: 790 },
    'Grade 5': { current: 620, floor: 575, ceiling: 680 },
  },
};

/** Platform floor = 93% of the reference price. Offers below it are rejected. */
export const FLOOR_RATIO = 0.93;

export function floorFor(referencePrice: number): number {
  return Math.round((referencePrice * FLOOR_RATIO) / 5) * 5;
}

/** Farm-gate red cherry price band, ETB/kg, 2025/26. */
export const CHERRY_PRICE_ETB = { min: 120, max: 185 };

export const PRICE_SOURCE_NOTE =
  'Estimated 2025/26 Jimma green-coffee price (ECTA floors, FOB ranges, cherry prices; 1 USD ≈ 155 ETB)';

/** Build a 30-day history that trends up to the current price. */
export function buildHistory(current: number): Array<{ date: Date; pricePerKgETB: number }> {
  const steps = [0.94, 0.96, 0.98, 1];
  return steps.map((factor, index) => ({
    date: new Date(Date.now() - (30 - index * 10) * 86400000),
    pricePerKgETB: Math.round((current * factor) / 5) * 5,
  }));
}
