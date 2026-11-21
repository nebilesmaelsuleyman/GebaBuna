import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRoles } from '../middleware/authMiddleware';
import { BuyerProfile } from '../models/BuyerProfile';
import { FarmerProfile } from '../models/FarmerProfile';
import { User } from '../models/User';
import { Trade } from '../models/Trade';
import { Listing } from '../models/Listing';
import { VerificationLog } from '../models/VerificationLog';
import { createNotification } from '../services/notificationService';

const router = Router();

// Protect all admin routes
router.use(authenticateJWT);
router.use(requireRoles(['admin']));

/**
 * GET /api/v1/admin/buyers/pending
 * Pending verification queue for regional agriculture bureau
 */
router.get('/buyers/pending', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const buyers = await BuyerProfile.find({ verificationStatus: 'pending' })
      .populate('user', 'fullName phone email avatar')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: buyers.length,
      buyers,
      note: 'In production, connect to the Ministry of Trade & Regional Agriculture Bureau license registry API.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/buyers
 * All buyers list with verification and fairness status
 */
router.get('/buyers', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status && status !== 'all') {
      filter.verificationStatus = status;
    }

    const buyers = await BuyerProfile.find(filter)
      .populate('user', 'fullName phone email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: buyers.length, buyers });
  } catch (err) {
    next(err);
  }
});

const verifyDecisionSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend']),
  checklist: z
    .object({
      validTradeLicense: z.boolean().default(false),
      validExportLicense: z.boolean().default(false),
      tinValid: z.boolean().default(false),
      noPastViolations: z.boolean().default(false),
    })
    .optional(),
  reason: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

/**
 * POST /api/v1/admin/buyers/:id/verify
 * Admin verifies, rejects, or suspends a buyer with an audit log
 */
router.post(
  '/buyers/:id/verify',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = verifyDecisionSchema.parse(req.body);
      const buyer = await BuyerProfile.findById(req.params.id);

      if (!buyer) {
        res.status(404).json({ success: false, message: 'Buyer profile not found' });
        return;
      }

      let newStatus: 'verified' | 'rejected' | 'suspended';
      if (validated.action === 'approve') newStatus = 'verified';
      else if (validated.action === 'reject') newStatus = 'rejected';
      else newStatus = 'suspended';

      if (validated.checklist) {
        buyer.verificationChecklist = {
          validTradeLicense: !!validated.checklist.validTradeLicense,
          validExportLicense: !!validated.checklist.validExportLicense,
          tinValid: !!validated.checklist.tinValid,
          noPastViolations: !!validated.checklist.noPastViolations,
        };
      }

      buyer.verificationStatus = newStatus;
      buyer.reviewedBy = req.user!._id;
      buyer.reviewedAt = new Date();
      if (validated.reason) buyer.rejectionReason = validated.reason;
      if (validated.notes) buyer.adminNotes = validated.notes;

      await buyer.save();

      // Create permanent audit log
      await VerificationLog.create({
        buyer: buyer._id,
        reviewedBy: req.user!._id,
        action: newStatus === 'verified' ? 'approved' : newStatus,
        checklistSnapshot: buyer.verificationChecklist,
        reason: validated.reason,
        notes: validated.notes,
        reviewedAt: new Date(),
      });

      // Send in-app notification to buyer
      const notifType = newStatus === 'verified' ? 'verification_approved' : 'verification_rejected';
      await createNotification({
        recipient: buyer.user,
        type: notifType,
        title:
          newStatus === 'verified'
            ? 'Account Verified by Jimma Agriculture Bureau!'
            : `Verification ${newStatus.toUpperCase()}`,
        message:
          newStatus === 'verified'
            ? 'Congratulations! Your trade license and TIN were verified. You can now make offers and buy coffee directly from farmers.'
            : `Your verification status was set to ${newStatus}. Reason: ${validated.reason || 'Missing or invalid documents.'}`,
        link: '/buyer/dashboard',
      });

      res.json({
        success: true,
        message: `Buyer status updated to ${newStatus}`,
        buyer,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/dashboard-stats
 * High-level KPIs for government / regional agriculture bureau officers
 */
router.get('/dashboard-stats', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalFarmers,
      totalBuyers,
      pendingVerifications,
      totalListings,
      totalTrades,
      tradesData,
      flaggedBuyers,
    ] = await Promise.all([
      FarmerProfile.countDocuments(),
      BuyerProfile.countDocuments(),
      BuyerProfile.countDocuments({ verificationStatus: 'pending' }),
      Listing.countDocuments(),
      Trade.countDocuments({ status: 'completed' }),
      Trade.find({ status: 'completed' }).select('agreedPricePerKg agreedQuantityKg totalAmountETB marketReferencePrice createdAt'),
      BuyerProfile.find({ fairnessScore: { $lt: 50 }, verificationStatus: 'verified' })
        .populate('user', 'fullName phone email')
        .select('companyName fairnessScore totalKgBought numberCompletedTrades'),
    ]);

    // Aggregate volume and average price paid vs market price
    let totalKgTraded = 0;
    let totalETBValue = 0;
    let sumPricePaid = 0;
    let sumMarketRefPrice = 0;

    for (const t of tradesData) {
      totalKgTraded += t.agreedQuantityKg;
      totalETBValue += t.totalAmountETB;
      sumPricePaid += t.agreedPricePerKg;
      sumMarketRefPrice += t.marketReferencePrice;
    }

    const tradeCount = tradesData.length || 1;
    const avgPricePaid = Math.round((sumPricePaid / tradeCount) * 10) / 10;
    const avgMarketPrice = Math.round((sumMarketRefPrice / tradeCount) * 10) / 10;
    const fairnessRatioOverall = Math.round((avgPricePaid / (avgMarketPrice || 1)) * 100);

    res.json({
      success: true,
      stats: {
        totalFarmers,
        totalBuyers,
        pendingVerifications,
        totalListings,
        completedTrades: totalTrades,
        totalKgTraded,
        totalETBValue,
        avgPricePaid,
        avgMarketPrice,
        fairnessRatioOverall,
        flaggedBuyersCount: flaggedBuyers.length,
      },
      flaggedBuyers,
      chartData: [
        { month: 'Jul', marketPrice: 280, paidPrice: 260, fairRatio: 92 },
        { month: 'Aug', marketPrice: 300, paidPrice: 285, fairRatio: 95 },
        { month: 'Sep', marketPrice: 315, paidPrice: 310, fairRatio: 98 },
        { month: 'Oct', marketPrice: 330, paidPrice: 335, fairRatio: 101 },
        { month: 'Nov', marketPrice: 350, paidPrice: 355, fairRatio: 101 },
      ],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
