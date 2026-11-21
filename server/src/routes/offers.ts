import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRoles, requireVerifiedBuyer } from '../middleware/authMiddleware';
import { Offer } from '../models/Offer';
import { Listing } from '../models/Listing';
import { Trade } from '../models/Trade';
import { BuyerProfile } from '../models/BuyerProfile';
import { getMarketReferencePrice, evaluatePriceFairness } from '../services/marketPriceService';
import { createNotification } from '../services/notificationService';

const router = Router();

const createOfferSchema = z.object({
  listingId: z.string(),
  offeredPricePerKg: z.coerce.number().min(1, 'Price must be greater than 0'),
  quantityKg: z.coerce.number().min(1, 'Quantity must be greater than 0'),
  message: z.string().optional().default(''),
  deliveryTerms: z.enum(['buyer_pickup', 'farmer_delivery', 'cooperative_warehouse']).default('buyer_pickup'),
});

/**
 * POST /api/v1/offers
 * Only VERIFIED buyers can submit offers
 */
router.post(
  '/',
  authenticateJWT,
  requireRoles(['buyer']),
  requireVerifiedBuyer,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = createOfferSchema.parse(req.body);

      const listing = await Listing.findById(validated.listingId);
      if (!listing || listing.status !== 'open') {
        res.status(400).json({ success: false, message: 'Listing is not available for offers.' });
        return;
      }

      if (validated.quantityKg > listing.quantityKg) {
        res.status(400).json({
          success: false,
          message: `Offered quantity (${validated.quantityKg} kg) exceeds available quantity (${listing.quantityKg} kg).`,
        });
        return;
      }

      const buyerProfile = await BuyerProfile.findOne({ user: req.user!._id });
      const refPrice = await getMarketReferencePrice(listing.processing, listing.grade);
      const fairness = evaluatePriceFairness(validated.offeredPricePerKg, refPrice);

      const offer = await Offer.create({
        listing: listing._id,
        farmer: listing.farmer,
        buyer: req.user!._id,
        buyerProfile: buyerProfile?._id,
        offeredPricePerKg: validated.offeredPricePerKg,
        quantityKg: validated.quantityKg,
        totalPriceETB: validated.offeredPricePerKg * validated.quantityKg,
        message: validated.message,
        deliveryTerms: validated.deliveryTerms,
        status: 'pending',
        marketPriceAtOffer: refPrice,
        priceFairnessDiff: fairness.diff,
        fairnessPercentage: fairness.percentageOfMarket,
        fairnessStatus: fairness.status,
      });

      // Notify farmer of new incoming offer
      await createNotification({
        recipient: listing.farmer,
        type: 'new_offer',
        title: 'New Offer Received!',
        message: `${buyerProfile?.companyName || 'A verified buyer'} made an offer of ${validated.offeredPricePerKg} ETB/kg for ${validated.quantityKg} kg (${fairness.label}).`,
        link: `/farmer/offers`,
        metadata: { offerId: offer._id, listingId: listing._id },
      });

      res.status(201).json({
        success: true,
        message: 'Offer submitted to farmer successfully',
        offer,
        fairnessAnalysis: fairness,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/offers/incoming (Farmer views offers for their listings)
 */
router.get(
  '/incoming',
  authenticateJWT,
  requireRoles(['farmer']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offers = await Offer.find({ farmer: req.user!._id })
        .populate('listing', 'coffeeType grade processing askingPricePerKg quantityKg location photos')
        .populate('buyer', 'fullName phone email avatar')
        .populate('buyerProfile', 'companyName businessType verificationStatus fairnessScore fairnessRank averageRatingFromFarmers')
        .sort({ createdAt: -1 });

      res.json({ success: true, offers });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/offers/outgoing (Buyer views their sent offers)
 */
router.get(
  '/outgoing',
  authenticateJWT,
  requireRoles(['buyer']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offers = await Offer.find({ buyer: req.user!._id })
        .populate('listing', 'coffeeType grade processing askingPricePerKg quantityKg location photos')
        .populate('farmer', 'fullName phone avatar')
        .sort({ createdAt: -1 });

      res.json({ success: true, offers });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/offers/:id/accept
 * Farmer accepts offer -> Creates Trade deal!
 */
router.post(
  '/:id/accept',
  authenticateJWT,
  requireRoles(['farmer']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offer = await Offer.findOne({ _id: req.params.id, farmer: req.user!._id });
      if (!offer) {
        res.status(404).json({ success: false, message: 'Offer not found or unauthorized' });
        return;
      }

      if (offer.status !== 'pending' && offer.status !== 'countered') {
        res.status(400).json({ success: false, message: `Offer is already ${offer.status}` });
        return;
      }

      const listing = await Listing.findById(offer.listing);
      if (!listing) {
        res.status(404).json({ success: false, message: 'Listing not found' });
        return;
      }

      // Check if price is final (if countered, use counter price)
      const agreedPrice = offer.counterPricePerKg || offer.offeredPricePerKg;
      const agreedQty = offer.counterQuantityKg || offer.quantityKg;

      offer.status = 'accepted';
      await offer.save();

      // Create official Trade / Deal record
      const trade = await Trade.create({
        listing: listing._id,
        offer: offer._id,
        farmer: offer.farmer,
        buyer: offer.buyer,
        agreedPricePerKg: agreedPrice,
        agreedQuantityKg: agreedQty,
        totalAmountETB: agreedPrice * agreedQty,
        marketReferencePrice: offer.marketPriceAtOffer,
        deliveryTerms: offer.deliveryTerms,
        status: 'agreed',
      });

      // Update listing status
      if (agreedQty >= listing.quantityKg) {
        listing.status = 'sold';
      } else {
        listing.status = 'in_negotiation';
        listing.quantityKg -= agreedQty;
      }
      await listing.save();

      // Notify buyer that offer was accepted
      await createNotification({
        recipient: offer.buyer,
        type: 'offer_accepted',
        title: 'Offer Accepted! Deal Created 🎉',
        message: `Farmer accepted your offer for ${listing.coffeeType}. Trade ID: ${trade._id}. Next step: Delivery and Payment confirmation.`,
        link: `/buyer/trades/${trade._id}`,
        metadata: { tradeId: trade._id },
      });

      res.json({
        success: true,
        message: 'Offer accepted and trade deal created successfully!',
        trade,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/offers/:id/counter
 * Farmer counters buyer's offer
 */
router.post(
  '/:id/counter',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { counterPricePerKg, counterQuantityKg, counterMessage } = req.body;
      const offer = await Offer.findById(req.params.id);

      if (!offer) {
        res.status(404).json({ success: false, message: 'Offer not found' });
        return;
      }

      const isFarmer = offer.farmer.toString() === req.user!._id.toString();
      const isBuyer = offer.buyer.toString() === req.user!._id.toString();

      if (!isFarmer && !isBuyer) {
        res.status(403).json({ success: false, message: 'Unauthorized' });
        return;
      }

      offer.counterPricePerKg = Number(counterPricePerKg);
      if (counterQuantityKg) offer.counterQuantityKg = Number(counterQuantityKg);
      offer.counterMessage = counterMessage || '';
      offer.counteredBy = isFarmer ? 'farmer' : 'buyer';
      offer.counteredAt = new Date();
      offer.status = 'countered';
      await offer.save();

      const recipientId = isFarmer ? offer.buyer : offer.farmer;
      await createNotification({
        recipient: recipientId,
        type: 'offer_countered',
        title: 'Counter-Offer Received',
        message: `${req.user!.fullName} counter-offered ${counterPricePerKg} ETB/kg: "${counterMessage || ''}"`,
        link: isFarmer ? '/buyer/offers' : '/farmer/offers',
        metadata: { offerId: offer._id },
      });

      res.json({ success: true, message: 'Counter-offer sent', offer });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/offers/:id/reject
 */
router.post(
  '/:id/reject',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offer = await Offer.findById(req.params.id);
      if (!offer) {
        res.status(404).json({ success: false, message: 'Offer not found' });
        return;
      }

      offer.status = 'rejected';
      await offer.save();

      await createNotification({
        recipient: offer.buyer,
        type: 'offer_rejected',
        title: 'Offer Declined',
        message: `Farmer has declined the offer for ${offer.quantityKg} kg.`,
        link: '/buyer/offers',
      });

      res.json({ success: true, message: 'Offer rejected', offer });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
