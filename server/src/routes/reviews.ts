import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/authMiddleware';
import { Review } from '../models/Review';
import { Trade } from '../models/Trade';
import { Listing } from '../models/Listing';
import {
  calculateQualityMatch,
  calculateFairnessMatch,
  recalculateFarmerScore,
  recalculateBuyerScore,
} from '../services/scoringService';

const router = Router();

const farmerReviewBuyerSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().min(2, 'Please write a brief comment'),
  paidOnTime: z.boolean().default(true),
});

const buyerReviewFarmerSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().min(2, 'Please write a brief comment'),
  gradeDelivered: z.string().default('Grade 1'),
  moistureNotes: z.string().optional().default('Optimal moisture ~11.5%'),
  defectNotes: z.string().optional().default('Clean sorting, low defects'),
  deliveredOnTime: z.boolean().default(true),
});

/**
 * POST /api/v1/reviews/trade/:tradeId
 * Submit trade review and generate report card metrics
 */
router.post(
  '/trade/:tradeId',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trade = await Trade.findById(req.params.tradeId).populate('listing');
      if (!trade) {
        res.status(404).json({ success: false, message: 'Trade not found.' });
        return;
      }

      const isFarmer = trade.farmer.toString() === req.user!._id.toString();
      const isBuyer = trade.buyer.toString() === req.user!._id.toString();

      if (!isFarmer && !isBuyer) {
        res.status(403).json({ success: false, message: 'Unauthorized for this trade.' });
        return;
      }

      // Check if already reviewed
      const existing = await Review.findOne({ trade: trade._id, reviewer: req.user!._id });
      if (existing) {
        res.status(400).json({ success: false, message: 'You have already submitted a review for this trade.' });
        return;
      }

      const listing = trade.listing as any;
      let reviewDoc: any;

      if (isFarmer) {
        // Farmer reviewing Buyer: evaluates Price Fairness & On-Time Payment
        const validated = farmerReviewBuyerSchema.parse(req.body);
        const fairnessCalc = calculateFairnessMatch(trade.agreedPricePerKg, trade.marketReferencePrice);

        reviewDoc = await Review.create({
          trade: trade._id,
          reviewer: req.user!._id,
          reviewee: trade.buyer,
          reviewerRole: 'farmer',
          rating: validated.rating,
          comment: validated.comment,
          pricePaidPerKg: trade.agreedPricePerKg,
          marketPriceBenchmark: trade.marketReferencePrice,
          fairnessRatio: fairnessCalc.fairnessRatio,
          fairnessMatchScore: fairnessCalc.fairnessMatchScore,
          paidOnTime: validated.paidOnTime,
        });

        trade.reviewSubmittedByFarmer = true;
        await trade.save();

        // Recalculate Buyer's Fairness Score
        await recalculateBuyerScore(trade.buyer);
      } else {
        // Buyer reviewing Farmer: evaluates Quality Promised vs Delivered & On-Time Delivery
        const validated = buyerReviewFarmerSchema.parse(req.body);
        const promisedGrade = listing?.grade || 'Grade 1';
        const qMatch = calculateQualityMatch(promisedGrade, validated.gradeDelivered);

        reviewDoc = await Review.create({
          trade: trade._id,
          reviewer: req.user!._id,
          reviewee: trade.farmer,
          reviewerRole: 'buyer',
          rating: validated.rating,
          comment: validated.comment,
          gradePromised: promisedGrade,
          gradeDelivered: validated.gradeDelivered,
          qualityMatchScore: qMatch,
          moistureNotes: validated.moistureNotes,
          defectNotes: validated.defectNotes,
          deliveredOnTime: validated.deliveredOnTime,
        });

        trade.reviewSubmittedByBuyer = true;
        await trade.save();

        // Recalculate Farmer's Quality Score
        await recalculateFarmerScore(trade.farmer);
      }

      res.status(201).json({
        success: true,
        message: 'Trade report card submitted and score recalculated successfully!',
        review: reviewDoc,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/reviews/trade/:tradeId/report-card
 * Fetches the complete bilateral Trade Report Card (Farmer + Buyer)
 */
router.get(
  '/trade/:tradeId/report-card',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trade = await Trade.findById(req.params.tradeId)
        .populate('listing')
        .populate('farmer', 'fullName phone email avatar')
        .populate('buyer', 'fullName phone email avatar');

      if (!trade) {
        res.status(404).json({ success: false, message: 'Trade not found.' });
        return;
      }

      const reviews = await Review.find({ trade: trade._id })
        .populate('reviewer', 'fullName role avatar')
        .populate('reviewee', 'fullName role avatar');

      const farmerReview = reviews.find((r) => r.reviewerRole === 'farmer');
      const buyerReview = reviews.find((r) => r.reviewerRole === 'buyer');

      res.json({
        success: true,
        trade,
        farmerReportCard: buyerReview || null, // Buyer's evaluation of farmer quality
        buyerReportCard: farmerReview || null,  // Farmer's evaluation of buyer fairness
        summary: {
          agreedPrice: trade.agreedPricePerKg,
          marketReferencePrice: trade.marketReferencePrice,
          fairnessPercentage: Math.round((trade.agreedPricePerKg / trade.marketReferencePrice) * 100),
          quantityKg: trade.agreedQuantityKg,
          totalAmountETB: trade.totalAmountETB,
          completedAt: trade.completedAt || trade.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
