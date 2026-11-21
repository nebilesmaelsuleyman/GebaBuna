import { Router, Request, Response, NextFunction } from 'express';
import { MarketPrice } from '../models/MarketPrice';
import { authenticateJWT, AuthenticatedRequest, requireRoles } from '../middleware/authMiddleware';
import { refreshECXPricesFromInternet } from '../services/ecxPriceService';

const router = Router();

/**
 * --------------------------------------------------------------------------
 * ☕ INTEGRATION NOTE FOR PRODUCTION ECX / INTERNATIONAL COFFEE COMMODITY FEEDS:
 * --------------------------------------------------------------------------
 * To plug in live Ethiopian Commodity Exchange (ECX) or Reuters/ICO price data:
 * 1. Implement a cron service (e.g., node-cron running at 17:00 EAT every weekday).
 * 2. Fetch daily closing contract prices from:
 *    - ECX Market Data Portal API: https://www.ecx.com.et/data/market/coffee/jimma
 *    - Or ICE Coffee 'C' Arabica futures via Bloomberg / AlphaVantage commodity API
 *    - Convert USD/lb -> ETB/kg using National Bank of Ethiopia daily exchange rate.
 * 3. Update the `MarketPrice` collection with `currentPricePerKgETB` and append to `history`.
 * --------------------------------------------------------------------------
 */

/**
 * GET /api/v1/market-prices
 * Returns all active ECX reference benchmark prices
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prices = await MarketPrice.find().sort({ processing: 1, grade: 1 });
    res.json({
      success: true,
      data: prices,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      lastRefreshed: new Date(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/market-prices/history
 * Returns historical price points formatted for Recharts line charts
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { grade = 'Grade 1', processing = 'washed' } = req.query;
    const priceDoc = await MarketPrice.findOne({ grade, processing });

    if (!priceDoc) {
      res.status(404).json({ success: false, message: 'Price history not found for this grade' });
      return;
    }

    res.json({
      success: true,
      coffeeType: priceDoc.coffeeType,
      processing: priceDoc.processing,
      grade: priceDoc.grade,
      currentPrice: priceDoc.currentPricePerKgETB,
      history: priceDoc.history,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/market-prices/refresh
 * Admin triggers a live ECX price fetch from the internet and persists to MongoDB.
 */
router.post(
  '/refresh',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await refreshECXPricesFromInternet();

      if (!result.success) {
        res.status(502).json({
          success: false,
          message: 'Failed to fetch live ECX prices from the internet',
          sourceUsed: result.sourceUsed,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: `Refreshed ${result.updated} ECX price(s) from live internet source: ${result.sourceUsed}`,
        updated: result.updated,
        sourceUsed: result.sourceUsed,
        prices: result.prices,
        refreshedAt: new Date(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/market-prices/:id
 * Admin updates benchmark price
 */
router.put(
  '/:id',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPricePerKgETB, floorPricePerKgETB, ceilingPricePerKgETB, sourceNote } = req.body;

      const priceDoc = await MarketPrice.findById(req.params.id);
      if (!priceDoc) {
        res.status(404).json({ success: false, message: 'Market price record not found' });
        return;
      }

      if (currentPricePerKgETB) {
        priceDoc.currentPricePerKgETB = currentPricePerKgETB;
        priceDoc.history.push({
          date: new Date(),
          pricePerKgETB: currentPricePerKgETB,
          sourceNote: sourceNote || 'Updated by Jimma Regional Agriculture Bureau Admin',
        });
      }

      if (floorPricePerKgETB) priceDoc.floorPricePerKgETB = floorPricePerKgETB;
      if (ceilingPricePerKgETB) priceDoc.ceilingPricePerKgETB = ceilingPricePerKgETB;
      priceDoc.lastUpdated = new Date();
      priceDoc.updatedBy = req.user!._id;

      await priceDoc.save();

      res.json({
        success: true,
        message: 'ECX reference price updated successfully',
        data: priceDoc,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
