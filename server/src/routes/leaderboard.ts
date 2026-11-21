import { Router, Request, Response, NextFunction } from 'express';
import { FarmerProfile } from '../models/FarmerProfile';
import { BuyerProfile } from '../models/BuyerProfile';
import { FARMER_RANKING_WEIGHTS } from '../services/scoringService';

const router = Router();

/**
 * GET /api/v1/leaderboard/criteria
 * Public explanation of how farmers are ranked
 */
router.get('/criteria', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      weights: FARMER_RANKING_WEIGHTS,
      notes: 'ECX grade midpoints: Specialty 95, G1 93, G2 85, G3 75, G4 66, G5 60. Moisture limit 11.5%. New farmers start at 70 on buyer-dependent criteria.',
    },
  });
});

/**
 * GET /api/v1/leaderboard/farmers
 * Ranked by averageQualityScore desc, then totalKgSold desc
 */
router.get('/farmers', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { zone, woreda } = req.query;
    const query: any = {};

    if (zone && zone !== 'all') {
      query.zone = new RegExp(String(zone), 'i');
    }
    if (woreda && woreda !== 'all') {
      query.woreda = new RegExp(String(woreda), 'i');
    }

    const farmers = await FarmerProfile.find(query)
      .populate('user', 'fullName phone avatar')
      .sort({ averageQualityScore: -1, totalKgSold: -1, averageRatingFromBuyers: -1 })
      .limit(50);

    const formatted = farmers.map((f, index) => ({
      rank: index + 1,
      id: f._id,
      userId: f.user?._id,
      fullName: f.fullName,
      photo: f.photo,
      zone: f.zone,
      woreda: f.woreda,
      kebele: f.kebele,
      farmSizeHectares: f.farmSizeHectares,
      coffeeVarieties: f.coffeeVarieties,
      processingMethods: f.processingMethods,
      qualityScore: f.averageQualityScore,
      rankingBreakdown: f.rankingBreakdown,
      totalKgSold: f.totalKgSold,
      completedTrades: f.numberCompletedTrades,
      averageRating: f.averageRatingFromBuyers,
      badge: index === 0 ? 'Gold' : index === 1 ? 'Silver' : index === 2 ? 'Bronze' : 'Verified Farmer',
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/leaderboard/buyers
 * Ranked by fairnessScore desc, then totalKgBought desc
 */
router.get('/buyers', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { zone } = req.query;
    const query: any = { verificationStatus: 'verified' }; // Only verified buyers

    if (zone && zone !== 'all') {
      query.zone = new RegExp(String(zone), 'i');
    }

    const buyers = await BuyerProfile.find(query)
      .populate('user', 'fullName phone email avatar')
      .sort({ fairnessScore: -1, totalKgBought: -1, averageRatingFromFarmers: -1 })
      .limit(50);

    const formatted = buyers.map((b, index) => ({
      rank: index + 1,
      id: b._id,
      userId: b.user?._id,
      companyName: b.companyName,
      ownerName: b.ownerName,
      businessType: b.businessType,
      zone: b.zone,
      address: b.address,
      fairnessScore: b.fairnessScore,
      isFairBuyer: b.fairnessScore >= 85, // "Fair Buyer" label for fairness >= 85
      totalKgBought: b.totalKgBought,
      completedTrades: b.numberCompletedTrades,
      averageRating: b.averageRatingFromFarmers,
      verificationStatus: b.verificationStatus,
      badge: index === 0 ? 'Gold' : index === 1 ? 'Silver' : index === 2 ? 'Bronze' : 'Verified Partner',
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
});

export default router;
