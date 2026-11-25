import { Router, Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Listing } from '../models/Listing';
import { Trade } from '../models/Trade';
import { BuyerProfile } from '../models/BuyerProfile';
import { cacheMiddleware } from '../middleware/cacheMiddleware';

const router = Router();

const SETTLED_STATUSES = ['delivered', 'paid', 'completed'];

/**
 * GET /api/v1/stats/public
 * Live platform numbers for the homepage, computed from the database (cached in Redis)
 */
router.get(
  '/public',
  cacheMiddleware({ prefix: 'stats', ttlSeconds: 60 }),
  async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [farmers, buyers, openListings, tradeTotals, buyerFairness] = await Promise.all([
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'buyer' }),
      Listing.countDocuments({ status: { $in: ['open', 'in_negotiation'] } }),
      Trade.aggregate([
        { $match: { status: { $in: SETTLED_STATUSES } } },
        {
          $group: {
            _id: null,
            trades: { $sum: 1 },
            kg: { $sum: '$agreedQuantityKg' },
            etb: { $sum: '$totalAmountETB' },
            referenceEtb: { $sum: { $multiply: ['$marketReferencePrice', '$agreedQuantityKg'] } },
          },
        },
      ]),
      BuyerProfile.aggregate([{ $group: { _id: null, avg: { $avg: '$fairnessScore' } } }]),
    ]);

    const totals = tradeTotals[0] || { trades: 0, kg: 0, etb: 0, referenceEtb: 0 };
    const premiumPct = totals.referenceEtb > 0
      ? Math.round(((totals.etb - totals.referenceEtb) / totals.referenceEtb) * 1000) / 10
      : null;

    res.json({
      success: true,
      data: {
        farmers,
        buyers,
        openListings,
        settledTrades: totals.trades,
        kgTraded: totals.kg,
        etbPaid: totals.etb,
        premiumOverReferencePct: premiumPct,
        averageBuyerFairness: buyerFairness[0]?.avg != null ? Math.round(buyerFairness[0].avg) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
