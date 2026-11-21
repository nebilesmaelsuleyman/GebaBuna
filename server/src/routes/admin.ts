import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRoles } from '../middleware/authMiddleware';
import { BuyerProfile } from '../models/BuyerProfile';
import { FarmerProfile } from '../models/FarmerProfile';
import { User } from '../models/User';
import { Trade } from '../models/Trade';
import { Listing } from '../models/Listing';
import { VerificationLog } from '../models/VerificationLog';
import { Offer } from '../models/Offer';
import { AdminAuditLog } from '../models/AdminAuditLog';
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

      await AdminAuditLog.create({
        admin: req.user!._id,
        action: newStatus === 'verified' ? 'buyer_approved' : newStatus === 'rejected' ? 'buyer_rejected' : 'buyer_suspended',
        targetUser: buyer.user,
        targetRole: 'buyer',
        targetName: buyer.companyName,
        reason: validated.reason,
        details: { checklist: buyer.verificationChecklist, notes: validated.notes },
      });

      // Send in-app notification to buyer
      const notifType = newStatus === 'verified' ? 'verification_approved' : 'verification_rejected';
      await createNotification({
        recipient: buyer.user,
        type: notifType,
        title:
          newStatus === 'verified'
            ? 'Account Verified by System Admin!'
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

const SETTLED_STATUSES = ['delivered', 'paid', 'completed'];
const OPEN_LISTING_STATUSES = ['open', 'in_negotiation'];
const OPEN_OFFER_STATUSES = ['pending', 'countered'];

const settledTotalsGroup = {
  trades: { $sum: 1 },
  kg: { $sum: '$agreedQuantityKg' },
  etb: { $sum: '$totalAmountETB' },
  referenceEtb: { $sum: { $multiply: ['$marketReferencePrice', '$agreedQuantityKg'] } },
};

/**
 * GET /api/v1/admin/dashboard-stats
 * Platform-wide KPIs for the regional agriculture bureau, all computed from the database
 */
router.get('/dashboard-stats', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chartStart = new Date();
    chartStart.setUTCDate(1);
    chartStart.setUTCHours(0, 0, 0, 0);
    chartStart.setUTCMonth(chartStart.getUTCMonth() - 5);

    const [
      totalFarmers,
      totalBuyers,
      removedUsers,
      verifiedBuyers,
      pendingVerifications,
      totalListings,
      openListings,
      openKg,
      openOffers,
      tradesInProgress,
      settledTotals,
      monthly,
      flaggedBuyers,
    ] = await Promise.all([
      User.countDocuments({ role: 'farmer', isActive: true }),
      User.countDocuments({ role: 'buyer', isActive: true }),
      User.countDocuments({ role: { $in: ['farmer', 'buyer'] }, isActive: false }),
      BuyerProfile.countDocuments({ verificationStatus: 'verified' }),
      BuyerProfile.countDocuments({ verificationStatus: 'pending' }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: { $in: OPEN_LISTING_STATUSES } }),
      Listing.aggregate([
        { $match: { status: { $in: OPEN_LISTING_STATUSES } } },
        { $group: { _id: null, kg: { $sum: '$quantityKg' } } },
      ]),
      Offer.countDocuments({ status: { $in: OPEN_OFFER_STATUSES } }),
      Trade.countDocuments({ status: 'agreed' }),
      Trade.aggregate([{ $match: { status: { $in: SETTLED_STATUSES } } }, { $group: { _id: null, ...settledTotalsGroup } }]),
      Trade.aggregate([
        { $match: { status: { $in: SETTLED_STATUSES } } },
        { $addFields: { when: { $ifNull: ['$completedAt', '$createdAt'] } } },
        { $match: { when: { $gte: chartStart } } },
        { $group: { _id: { y: { $year: '$when' }, m: { $month: '$when' } }, ...settledTotalsGroup } },
      ]),
      BuyerProfile.find({ fairnessScore: { $lt: 50 } })
        .populate('user', 'fullName phone email isActive')
        .select('companyName ownerName fairnessScore verificationStatus rejectionReason adminNotes totalKgBought numberCompletedTrades'),
    ]);

    const totals = settledTotals[0] || { trades: 0, kg: 0, etb: 0, referenceEtb: 0 };
    const avgPricePaid = totals.kg ? Math.round(totals.etb / totals.kg) : 0;
    const avgMarketPrice = totals.kg ? Math.round(totals.referenceEtb / totals.kg) : 0;

    const chartData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(chartStart);
      date.setUTCMonth(chartStart.getUTCMonth() + i);
      const point = monthly.find((m: any) => m._id.y === date.getUTCFullYear() && m._id.m === date.getUTCMonth() + 1);
      return {
        month: date.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
        marketPrice: point?.kg ? Math.round(point.referenceEtb / point.kg) : 0,
        paidPrice: point?.kg ? Math.round(point.etb / point.kg) : 0,
        kg: point?.kg || 0,
        trades: point?.trades || 0,
      };
    });

    res.json({
      success: true,
      stats: {
        totalFarmers,
        totalBuyers,
        verifiedBuyers,
        removedUsers,
        pendingVerifications,
        totalListings,
        openListings,
        openKgListed: openKg[0]?.kg || 0,
        openOffers,
        tradesInProgress,
        completedTrades: totals.trades,
        totalKgTraded: totals.kg,
        totalETBValue: totals.etb,
        avgPricePaid,
        avgMarketPrice,
        fairnessRatioOverall: totals.referenceEtb ? Math.round((totals.etb / totals.referenceEtb) * 100) : 0,
        flaggedBuyersCount: flaggedBuyers.length,
      },
      flaggedBuyers,
      chartData,
    });
  } catch (err) {
    next(err);
  }
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/v1/admin/users?role=farmer|buyer&status=active|removed|all&q=
 * Every farmer or buyer with what they have sold or bought on the platform
 */
router.get('/users', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = req.query.role === 'buyer' ? 'buyer' : 'farmer';
    const status = String(req.query.status || 'all');
    const q = String(req.query.q || '').trim();

    const filter: any = { role };
    if (status === 'active') filter.isActive = true;
    if (status === 'removed') filter.isActive = false;
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ fullName: pattern }, { phone: pattern }, { email: pattern }];
      if (role === 'buyer') {
        const companies = await BuyerProfile.find({ $or: [{ companyName: pattern }, { tradeLicenseNumber: pattern }, { tinNumber: pattern }] }).select('user');
        filter.$or.push({ _id: { $in: companies.map((c) => c.user) } });
      } else {
        const farms = await FarmerProfile.find({ $or: [{ woreda: pattern }, { kebele: pattern }, { cooperativeMembership: pattern }] }).select('user');
        filter.$or.push({ _id: { $in: farms.map((f) => f.user) } });
      }
    }

    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();
    const ids = users.map((u) => u._id);
    const partyField = role === 'farmer' ? '$farmer' : '$buyer';
    const offerField = role === 'farmer' ? 'farmer' : 'buyer';

    const [profiles, tradeTotals, inProgress, openListings, openOffers] = await Promise.all([
      role === 'farmer'
        ? FarmerProfile.find({ user: { $in: ids } }).lean()
        : BuyerProfile.find({ user: { $in: ids } }).lean(),
      Trade.aggregate([
        { $match: { [offerField]: { $in: ids }, status: { $in: SETTLED_STATUSES } } },
        { $group: { _id: partyField, ...settledTotalsGroup } },
      ]),
      Trade.aggregate([
        { $match: { [offerField]: { $in: ids }, status: 'agreed' } },
        { $group: { _id: partyField, count: { $sum: 1 } } },
      ]),
      role === 'farmer'
        ? Listing.aggregate([
            { $match: { farmer: { $in: ids }, status: { $in: OPEN_LISTING_STATUSES } } },
            { $group: { _id: '$farmer', count: { $sum: 1 }, kg: { $sum: '$quantityKg' } } },
          ])
        : Promise.resolve([]),
      Offer.aggregate([
        { $match: { [offerField]: { $in: ids }, status: { $in: OPEN_OFFER_STATUSES } } },
        { $group: { _id: partyField, count: { $sum: 1 } } },
      ]),
    ]);

    const byUser = <T extends { _id?: any; user?: any }>(rows: T[], key: 'user' | '_id') =>
      new Map(rows.map((row: any) => [String(row[key]), row]));
    const profileMap = byUser(profiles as any[], 'user');
    const tradeMap = byUser(tradeTotals, '_id');
    const progressMap = byUser(inProgress, '_id');
    const listingMap = byUser(openListings as any[], '_id');
    const offerMap = byUser(openOffers, '_id');

    const rows = users.map((u) => {
      const id = String(u._id);
      const profile: any = profileMap.get(id) || {};
      const trades: any = tradeMap.get(id) || {};
      const base = {
        id,
        fullName: u.fullName,
        phone: u.phone,
        email: u.email,
        isActive: u.isActive,
        removedAt: u.removedAt,
        removedReason: u.removedReason,
        joinedAt: u.createdAt,
        settledTrades: trades.trades || 0,
        kgTraded: trades.kg || 0,
        etbTraded: trades.etb || 0,
        premiumOverReferencePct: trades.referenceEtb
          ? Math.round(((trades.etb - trades.referenceEtb) / trades.referenceEtb) * 1000) / 10
          : null,
        tradesInProgress: (progressMap.get(id) as any)?.count || 0,
        openOffers: (offerMap.get(id) as any)?.count || 0,
      };
      if (role === 'farmer') {
        const listings: any = listingMap.get(id) || {};
        return {
          ...base,
          woreda: profile.woreda,
          kebele: profile.kebele,
          cooperative: profile.cooperativeMembership,
          farmSizeHectares: profile.farmSizeHectares,
          qualityScore: profile.averageQualityScore,
          qualityRank: profile.qualityRank,
          openListings: listings.count || 0,
          openKgListed: listings.kg || 0,
        };
      }
      return {
        ...base,
        buyerProfileId: profile._id,
        companyName: profile.companyName,
        businessType: profile.businessType,
        tradeLicenseNumber: profile.tradeLicenseNumber,
        tinNumber: profile.tinNumber,
        verificationStatus: profile.verificationStatus,
        fairnessScore: profile.fairnessScore,
        averageRatingFromFarmers: profile.averageRatingFromFarmers,
      };
    });

    res.json({ success: true, role, count: rows.length, users: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/trades?status=
 * Recent trades across the platform with both parties
 */
router.get('/trades', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const trades = await Trade.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('farmer', 'fullName phone')
      .populate('buyer', 'fullName')
      .populate('listing', 'coffeeType grade processing location')
      .lean();

    const buyerProfiles = await BuyerProfile.find({ user: { $in: trades.map((t: any) => t.buyer?._id) } })
      .select('user companyName')
      .lean();
    const companyByUser = new Map(buyerProfiles.map((b) => [String(b.user), b.companyName]));

    res.json({
      success: true,
      count: trades.length,
      trades: trades.map((t: any) => ({
        id: t._id,
        status: t.status,
        farmerName: t.farmer?.fullName || 'Unknown farmer',
        buyerName: companyByUser.get(String(t.buyer?._id)) || t.buyer?.fullName || 'Unknown buyer',
        coffeeType: t.listing?.coffeeType,
        processing: t.listing?.processing,
        grade: t.listing?.grade,
        woreda: t.listing?.location?.woreda,
        quantityKg: t.agreedQuantityKg,
        pricePerKg: t.agreedPricePerKg,
        referencePricePerKg: t.marketReferencePrice,
        totalETB: t.totalAmountETB,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const removeSchema = z.object({
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters for the audit log.'),
});

/**
 * POST /api/v1/admin/users/:id/remove
 * Removes a farmer or buyer: blocks login, withdraws open listings and offers.
 * Trade history is kept for audits; trades already agreed are reported so the bureau can follow up.
 */
router.post('/users/:id/remove', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = removeSchema.parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.role === 'admin') {
      res.status(400).json({ success: false, message: 'Admin accounts cannot be removed from this panel.' });
      return;
    }
    if (!user.isActive) {
      res.status(400).json({ success: false, message: `${user.fullName} is already removed.` });
      return;
    }

    user.isActive = false;
    user.removedAt = new Date();
    user.removedReason = reason;
    user.removedBy = req.user!._id;
    await user.save();

    const partyField = user.role === 'farmer' ? 'farmer' : 'buyer';
    const affectedOffers = await Offer.find({ [partyField]: user._id, status: { $in: OPEN_OFFER_STATUSES } }).select('farmer buyer');
    await Offer.updateMany({ _id: { $in: affectedOffers.map((o) => o._id) } }, { status: 'withdrawn' });

    let listingsCancelled = 0;
    let displayName = user.fullName;
    if (user.role === 'farmer') {
      const result = await Listing.updateMany(
        { farmer: user._id, status: { $in: OPEN_LISTING_STATUSES } },
        { status: 'cancelled' }
      );
      listingsCancelled = result.modifiedCount;
    } else {
      const profile = await BuyerProfile.findOneAndUpdate(
        { user: user._id },
        { verificationStatus: 'suspended', adminNotes: `Removed by bureau: ${reason}` },
        { new: true }
      );
      if (profile) displayName = profile.companyName;
    }

    for (const offer of affectedOffers) {
      await createNotification({
        recipient: user.role === 'farmer' ? offer.buyer : offer.farmer,
        type: 'offer_rejected',
        title: 'Offer withdrawn',
        message: `An open offer was withdrawn because ${displayName} was removed from Buna by the Jimma Agriculture Bureau.`,
      });
    }

    const tradesInProgress = await Trade.countDocuments({ [partyField]: user._id, status: { $in: ['agreed', 'delivered'] } });

    await AdminAuditLog.create({
      admin: req.user!._id,
      action: 'user_removed',
      targetUser: user._id,
      targetRole: user.role,
      targetName: displayName,
      reason,
      details: { offersWithdrawn: affectedOffers.length, listingsCancelled, tradesInProgress },
    });

    res.json({
      success: true,
      message: `${displayName} was removed. ${affectedOffers.length} open offer(s) withdrawn, ${listingsCancelled} listing(s) cancelled.`,
      summary: { offersWithdrawn: affectedOffers.length, listingsCancelled, tradesInProgress },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/admin/users/:id/restore
 * Restores a removed account. Buyers go back to the verification queue.
 */
router.post('/users/:id/restore', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.isActive) {
      res.status(400).json({ success: false, message: `${user.fullName} is already active.` });
      return;
    }

    user.isActive = true;
    user.removedAt = undefined;
    user.removedReason = '';
    user.removedBy = undefined;
    await user.save();

    let displayName = user.fullName;
    if (user.role === 'buyer') {
      const profile = await BuyerProfile.findOneAndUpdate(
        { user: user._id },
        { verificationStatus: 'pending' },
        { new: true }
      );
      if (profile) displayName = profile.companyName;
    }

    await AdminAuditLog.create({
      admin: req.user!._id,
      action: 'user_restored',
      targetUser: user._id,
      targetRole: user.role,
      targetName: displayName,
      reason: String(req.body?.reason || ''),
    });

    res.json({
      success: true,
      message:
        user.role === 'buyer'
          ? `${displayName} was restored and is back in the verification queue.`
          : `${displayName} was restored and can sign in again.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/admin/audit-log
 * Every admin decision, newest first
 */
router.get('/audit-log', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const entries = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(100).populate('admin', 'fullName').lean();
    res.json({ success: true, count: entries.length, entries });
  } catch (err) {
    next(err);
  }
});


export default router;
