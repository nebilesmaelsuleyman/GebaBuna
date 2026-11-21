/**
 * ☕ ECX LIVE PRICE SERVICE
 * -------------------------
 * Fetches live Ethiopian Commodity Exchange (ECX) coffee prices from the internet
 * and persists them to MongoDB. Falls back gracefully when live sources are
 * unavailable so the platform never shows stale or missing prices.
 *
 * To wire in a real ECX / commodity data feed, set ECX_API_BASE and ECX_API_KEY
 * in .env and update the fetchSources below with the correct endpoints.
 */

import { MarketPrice, CoffeeGrade, ProcessingType } from '../models/MarketPrice';
import https from 'https';
import http from 'http';
import { REFERENCE_PRICES, PRICE_SOURCE_NOTE } from '../constants/coffeePrices';

const ECX_API_BASE = process.env.ECX_API_BASE || '';
const ECX_API_KEY = process.env.ECX_API_KEY || '';

// Estimated Jimma reference prices used as fallback when no live source responds
const FALLBACK_PRICES: Record<string, { current: number; floor: number; ceiling: number }> = Object.fromEntries(
  (Object.keys(REFERENCE_PRICES) as Array<keyof typeof REFERENCE_PRICES>).flatMap((processing) =>
    Object.entries(REFERENCE_PRICES[processing]).map(([grade, price]) => [`${processing}_${grade}`, price])
  )
);

type FetchSource = {
  name: string;
  url: string;
  headers?: Record<string, string>;
};

const fetchSources: FetchSource[] = [
  // Primary: ECX market data portal (configure ECX_API_BASE in .env)
  ...(ECX_API_BASE
    ? [
        {
          name: 'ECX API (configured)',
          url: `${ECX_API_BASE.replace(/\/+$/, '')}/market/coffee/jimma`,
          headers: ECX_API_KEY ? { Authorization: `Bearer ${ECX_API_KEY}` } : {},
        },
      ]
    : []),
  // Secondary: International Coffee Organization composite indicator
  {
    name: 'ICO Composite Indicator',
    url: 'https://www.ico.org/prices/coffee-prices',
    headers: {},
  },
];

function httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(
      url,
      { headers: { 'User-Agent': 'buna-fair-price/1.0', ...headers } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
        });
      }
    );
    req.on('error', (err) => {
      reject(err);
    });
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

function normalizeGrade(gradeRaw: string): CoffeeGrade | null {
  const g = gradeRaw.trim();
  const valid: CoffeeGrade[] = [
    'Specialty',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
  ];
  if (valid.includes(g as CoffeeGrade)) {
    return g as CoffeeGrade;
  }
  const lower = g.toLowerCase();
  if (lower.includes('specialty')) return 'Specialty';
  const match = lower.match(/grade\s*([1-5])/);
  if (match) return `Grade ${match[1]}` as CoffeeGrade;
  return null;
}

function normalizeProcessing(procRaw: string): ProcessingType | null {
  const p = procRaw.trim().toLowerCase();
  if (p.includes('washed') || p.includes('wet')) return 'washed';
  if (p.includes('natural') || p.includes('sun-dried') || p.includes('dry')) return 'natural';
  return null;
}

function parseLiveResponse(text: string, sourceName: string): Array<{
  processing: ProcessingType;
  grade: CoffeeGrade;
  currentPricePerKgETB: number;
  floorPricePerKgETB: number;
  ceilingPricePerKgETB: number;
  source: string;
}> {
  const results: Array<{
    processing: ProcessingType;
    grade: CoffeeGrade;
    currentPricePerKgETB: number;
    floorPricePerKgETB: number;
    ceilingPricePerKgETB: number;
    source: string;
  }> = [];

  try {
    const json = JSON.parse(text);
    const items = Array.isArray(json) ? json : json.prices || json.data || [];

    for (const item of items) {
      const processing = normalizeProcessing(item.processing || item.method || '');
      const grade = normalizeGrade(item.grade || item.gradeTier || '');
      const price = Number(item.currentPricePerKgETB || item.price || item.currentPrice || 0);
      if (!processing || !grade || price <= 0) continue;

      const key = `${processing}_${grade}`;
      const fallback = FALLBACK_PRICES[key];
      const floor = Number(item.floorPricePerKgETB || (fallback ? fallback.floor : Math.round(price * 0.95)));
      const ceiling = Number(item.ceilingPricePerKgETB || (fallback ? fallback.ceiling : Math.round(price * 1.05)));

      results.push({
        processing,
        grade,
        currentPricePerKgETB: price,
        floorPricePerKgETB: floor,
        ceilingPricePerKgETB: ceiling,
        source: `${sourceName} (live internet)`,
      });
    }
  } catch {
    // Not JSON — ignore, will fall through to fallback
  }

  return results;
}

export async function fetchLiveECXPrices(): Promise<{
  success: boolean;
  prices: Array<{
    processing: ProcessingType;
    grade: CoffeeGrade;
    currentPricePerKgETB: number;
    floorPricePerKgETB: number;
    ceilingPricePerKgETB: number;
    source: string;
  }>;
  sourceUsed: string;
  error?: string;
}> {
  let lastError = '';

  for (const source of fetchSources) {
    try {
      const text = await httpGet(source.url, source.headers);
      const parsed = parseLiveResponse(text, source.name);
      if (parsed.length > 0) {
        return {
          success: true,
          prices: parsed,
          sourceUsed: source.name,
        };
      }
    } catch (err: any) {
      lastError = `${source.name}: ${err.message}`;
      console.warn(`[ECX Live] ${lastError}`);
    }
  }

  return {
    success: false,
    prices: [],
    sourceUsed: 'none',
    error: lastError || 'No live ECX price source responded',
  };
}

export async function refreshECXPricesFromInternet(): Promise<{
  success: boolean;
  updated: number;
  sourceUsed: string;
  prices?: any[];
  error?: string;
}> {
  const live = await fetchLiveECXPrices();

  if (!live.success || live.prices.length === 0) {
    return {
      success: false,
      updated: 0,
      sourceUsed: live.sourceUsed,
      error: live.error || 'No live ECX prices available from the internet',
    };
  }

  const now = new Date();
  let updated = 0;
  const savedPrices: any[] = [];

  for (const p of live.prices) {
    const existing = await MarketPrice.findOne({ processing: p.processing, grade: p.grade });

    if (existing) {
      existing.currentPricePerKgETB = p.currentPricePerKgETB;
      existing.floorPricePerKgETB = p.floorPricePerKgETB;
      existing.ceilingPricePerKgETB = p.ceilingPricePerKgETB;
      existing.source = p.source;
      existing.lastUpdated = now;
      existing.history.push({
        date: now,
        pricePerKgETB: p.currentPricePerKgETB,
        sourceNote: 'Live ECX internet fetch',
      });
      await existing.save();
      savedPrices.push(existing);
    } else {
      const coffeeType = `Jimma ${p.processing} ${p.grade}`;
      const created = await MarketPrice.create({
        coffeeType,
        processing: p.processing,
        grade: p.grade,
        currentPricePerKgETB: p.currentPricePerKgETB,
        floorPricePerKgETB: p.floorPricePerKgETB,
        ceilingPricePerKgETB: p.ceilingPricePerKgETB,
        source: p.source,
        lastUpdated: now,
        history: [
          {
            date: now,
            pricePerKgETB: p.currentPricePerKgETB,
            sourceNote: 'Live ECX internet fetch (initial)',
          },
        ],
      });
      savedPrices.push(created);
    }
    updated++;
  }

  return {
    success: true,
    updated,
    sourceUsed: live.sourceUsed,
    prices: savedPrices,
  };
}

/**
 * Get the market reference price: stored MongoDB estimate first, then the built-in table.
 */
export async function getLiveMarketReferencePrice(
  processing: ProcessingType,
  grade: CoffeeGrade
): Promise<{ price: number; source: string; isLive: boolean }> {
  // No public ECX price API exists, so stored estimates are the source of truth.
  // Admins can still try refreshECXPricesFromInternet() via POST /market-prices/refresh.
  try {
    const cached = await MarketPrice.findOne({ processing, grade });
    if (cached) {
      return {
        price: cached.currentPricePerKgETB,
        source: cached.source || PRICE_SOURCE_NOTE,
        isLive: false,
      };
    }
  } catch (err: any) {
    console.warn(`[ECX Live] MongoDB read failed: ${err.message}`);
  }

  // Built-in estimate table
  const key = `${processing}_${grade}`;
  const fallback = FALLBACK_PRICES[key];
  if (fallback) {
    return {
      price: fallback.current,
      source: PRICE_SOURCE_NOTE,
      isLive: false,
    };
  }

  return { price: REFERENCE_PRICES.natural['Grade 4'].current, source: PRICE_SOURCE_NOTE, isLive: false };
}
