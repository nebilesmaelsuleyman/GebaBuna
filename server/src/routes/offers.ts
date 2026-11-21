import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRoles, requireVerifiedBuyer } from '../middleware/authMiddleware';
import { Offer } from '../models/Offer';
import { Listing } from '../models/Listing';
import { Trade } from '../models/Trade';
import { BuyerProfile } from '../models/BuyerProfile';
import { getMarketReferencePrice, evaluatePriceFairness } from '../services/marketPriceService';
import { createNotification } from '../services/notificationService';
import { floorFor } from '../constants/coffeePrices';

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
      const floorPrice = floorFor(refPrice);
      if (validated.offeredPricePerKg < floorPrice) {
        res.status(400).json({
          success: false,
          message: `Offer rejected: ${validated.offeredPricePerKg} ETB/kg is below the farmer protection floor of ${floorPrice} ETB/kg for ${listing.processing} ${listing.grade}.`,
          floorPrice,
          marketReferencePrice: refPrice,
        });
        return;
      }
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
        // Multi-round negotiation initiation (Round 1 of 3)
        round: 1,
        maxRounds: 3,
        currentTurn: 'farmer',
        currentPricePerKg: validated.offeredPricePerKg,
        currentQuantityKg: validated.quantityKg,
        lastActionBy: 'buyer',
        counterPricePerKg: validated.offeredPricePerKg,
        counterQuantityKg: validated.quantityKg,
        counteredBy: 'buyer',
        negotiationHistory: [
          {
            round: 1,
            senderRole: 'buyer',
            senderId: req.user!._id,
            senderName: buyerProfile?.companyName || req.user!.fullName || 'Buyer',
            action: validated.offeredPricePerKg === listing.askingPricePerKg ? 'initial_offer' : 'counter_offer',
            pricePerKg: validated.offeredPricePerKg,
            quantityKg: validated.quantityKg,
            totalAmountETB: validated.offeredPricePerKg * validated.quantityKg,
            message: validated.message || '',
            createdAt: new Date(),
          },
        ],
        marketPriceAtOffer: refPrice,
        priceFairnessDiff: fairness.diff,
        fairnessPercentage: fairness.percentageOfMarket,
        fairnessStatus: fairness.status,
      });

      // Notify farmer of new incoming offer (Round 1 of 3)
      await createNotification({
        recipient: listing.farmer,
        type: 'new_offer',
        title: 'New Offer Received (Round 1 of 3)!',
        message: `${buyerProfile?.companyName || req.user!.fullName || 'A verified buyer'} made a price proposal of ${validated.offeredPricePerKg} ETB/kg for ${validated.quantityKg} kg (Round 1 of 3: ${fairness.label}).`,
        link: `/farmer`,
        metadata: { offerId: offer._id, listingId: listing._id, round: 1 },
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
 * The party who did not make the latest proposal accepts it -> Creates Trade deal!
 * Farmer accepts a buyer's offer or buyer counter; buyer accepts a farmer counter.
 */
router.post(
  '/:id/accept',
  authenticateJWT,
  requireRoles(['farmer', 'buyer']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const offer = await Offer.findById(req.params.id);
      const userId = req.user!._id.toString();
      const isFarmer = offer?.farmer.toString() === userId;
      const isBuyer = offer?.buyer.toString() === userId;
      if (!offer || (!isFarmer && !isBuyer)) {
        res.status(404).json({ success: false, message: 'Offer not found or unauthorized' });
        return;
      }

      if (offer.status !== 'pending' && offer.status !== 'countered') {
        res.status(400).json({ success: false, message: `Offer is already ${offer.status}` });
        return;
      }

      const currentTurn = offer.currentTurn || (offer.status === 'countered' ? (offer.counteredBy === 'farmer' ? 'buyer' : 'farmer') : 'farmer');
      const userRole = isFarmer ? 'farmer' : 'buyer';
      if (userRole !== currentTurn) {
        res.status(400).json({ success: false, message: 'You made the latest proposal. Wait for the other side to accept, counter, or reject it.' });
        return;
      }

      if (isBuyer) {
        const buyerProfile = await BuyerProfile.findOne({ user: req.user!._id });
        if (buyerProfile?.verificationStatus !== 'verified') {
          res.status(403).json({ success: false, message: 'Only verified buyers can finalize a trade.' });
          return;
        }
      }

      const listing = await Listing.findById(offer.listing);
      if (!listing) {
        res.status(404).json({ success: false, message: 'Listing not found' });
        return;
      }

      // Check if price is final (if countered/multi-round, use current proposed price)
      const agreedPrice = offer.currentPricePerKg || offer.counterPricePerKg || offer.offeredPricePerKg;
      const agreedQty = offer.currentQuantityKg || offer.counterQuantityKg || offer.quantityKg;

      offer.status = 'accepted';
      if (!offer.negotiationHistory) offer.negotiationHistory = [];
      offer.negotiationHistory.push({
        round: offer.round || 1,
        senderRole: isFarmer ? 'farmer' : 'buyer',
        senderId: req.user!._id,
        senderName: req.user!.fullName,
        action: 'accepted',
        pricePerKg: agreedPrice,
        quantityKg: agreedQty,
        totalAmountETB: agreedPrice * agreedQty,
        message: 'Contract proposal accepted. Deal finalized!',
        createdAt: new Date(),
      });
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

      await createNotification({
        recipient: isFarmer ? offer.buyer : offer.farmer,
        type: 'offer_accepted',
        title: 'Offer Accepted! Deal Created 🎉',
        message: `${isFarmer ? 'The farmer' : 'The buyer'} accepted ${agreedPrice} ETB/kg for ${agreedQty} kg of ${listing.coffeeType}. Trade ID: ${trade._id}. Next step: Delivery and Payment confirmation.`,
        link: `/trades/${trade._id}`,
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
 * Counter-offer loop capped at 3 rounds maximum
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

      if (offer.status !== 'pending' && offer.status !== 'countered') {
        res.status(400).json({ success: false, message: `Offer is already ${offer.status}` });
        return;
      }

      // Determine who must respond
      const currentTurn = offer.currentTurn || (offer.status === 'countered' ? (offer.counteredBy === 'farmer' ? 'buyer' : 'farmer') : 'farmer');
      const userRole = isFarmer ? 'farmer' : 'buyer';
      if (userRole !== currentTurn) {
        res.status(400).json({
          success: false,
          message: 'It is not your turn to counter. Please wait for the other party to respond.',
        });
        return;
      }

      // STRICT CAP AT 3 NEGOTIATION ROUNDS
      const currentRound = offer.round || 1;
      if (currentRound >= 3) {
        res.status(400).json({
          success: false,
          message: 'Maximum negotiation limit reached (3 rounds). Counter-offers are disabled. Your only available actions are to Accept or Reject this deal.',
          round: currentRound,
          maxRounds: 3,
        });
        return;
      }

      const price = Number(counterPricePerKg);
      if (!Number.isFinite(price) || price <= 0) {
        res.status(400).json({ success: false, message: 'counterPricePerKg must be a positive number' });
        return;
      }
      const floorPrice = floorFor(offer.marketPriceAtOffer);
      if (price < floorPrice) {
        res.status(400).json({
          success: false,
          message: `Counter-offer rejected: ${price} ETB/kg is below the farmer protection floor of ${floorPrice} ETB/kg.`,
          floorPrice,
        });
        return;
      }

      const nextRound = currentRound + 1;
      const nextTurn = isFarmer ? 'buyer' : 'farmer';

      offer.round = nextRound;
      offer.maxRounds = 3;
      offer.currentTurn = nextTurn;
      offer.lastActionBy = isFarmer ? 'farmer' : 'buyer';
      offer.currentPricePerKg = price;
      if (counterQuantityKg && Number(counterQuantityKg) > 0) {
        offer.currentQuantityKg = Number(counterQuantityKg);
      } else if (!offer.currentQuantityKg) {
        offer.currentQuantityKg = offer.quantityKg;
      }
      offer.counterPricePerKg = price;
      offer.counterQuantityKg = offer.currentQuantityKg;
      offer.counterMessage = counterMessage || '';
      offer.counteredBy = isFarmer ? 'farmer' : 'buyer';
      offer.counteredAt = new Date();
      offer.status = 'countered';

      if (!offer.negotiationHistory) {
        offer.negotiationHistory = [];
      }
      offer.negotiationHistory.push({
        round: nextRound,
        senderRole: isFarmer ? 'farmer' : 'buyer',
        senderId: req.user!._id,
        senderName: req.user!.fullName || (isFarmer ? 'Farmer' : 'Buyer'),
        action: 'counter_offer',
        pricePerKg: price,
        quantityKg: offer.currentQuantityKg,
        totalAmountETB: price * offer.currentQuantityKg,
        message: counterMessage || '',
        createdAt: new Date(),
      });

      await offer.save();

      const recipientId = isFarmer ? offer.buyer : offer.farmer;
      const isFinalTurn = nextRound === 3;
      const roundTag = isFinalTurn ? ' (Final Round 3/3 - Accept or Reject only)' : ` (Round ${nextRound} of 3)`;

      await createNotification({
        recipient: recipientId,
        type: 'offer_countered',
        title: isFinalTurn ? 'Final Counter-Offer Received (Round 3/3)' : `Counter-Offer Received (Round ${nextRound}/3)`,
        message: `${req.user!.fullName} counter-offered ${price} ETB/kg${roundTag}: "${counterMessage || ''}"`,
        link: isFarmer ? '/buyer' : '/farmer',
        metadata: { offerId: offer._id, round: nextRound, isFinalTurn },
      });

      res.json({
        success: true,
        message: `Counter-offer submitted successfully (${nextRound}/3).`,
        offer,
        round: nextRound,
        isFinalTurn,
      });
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
      const userId = req.user!._id.toString();
      const isFarmer = offer?.farmer.toString() === userId;
      const isBuyer = offer?.buyer.toString() === userId;
      if (!offer || (!isFarmer && !isBuyer)) {
        res.status(404).json({ success: false, message: 'Offer not found or unauthorized' });
        return;
      }

      if (offer.status !== 'pending' && offer.status !== 'countered') {
        res.status(400).json({ success: false, message: `Offer is already ${offer.status}` });
        return;
      }

      const activePrice = offer.currentPricePerKg || offer.counterPricePerKg || offer.offeredPricePerKg;
      const activeQty = offer.currentQuantityKg || offer.counterQuantityKg || offer.quantityKg;

      offer.status = 'rejected';
      if (!offer.negotiationHistory) {
        offer.negotiationHistory = [];
      }
      offer.negotiationHistory.push({
        round: offer.round || 1,
        senderRole: isFarmer ? 'farmer' : 'buyer',
        senderId: req.user!._id,
        senderName: req.user!.fullName,
        action: 'rejected',
        pricePerKg: activePrice,
        quantityKg: activeQty,
        totalAmountETB: activePrice * activeQty,
        message: 'Offer declined. Deal permanently closed.',
        createdAt: new Date(),
      });
      await offer.save();

      await createNotification({
        recipient: isFarmer ? offer.buyer : offer.farmer,
        type: 'offer_rejected',
        title: 'Offer Declined (Deal Closed)',
        message: `${isFarmer ? 'The farmer' : 'The buyer'} declined the price offer. Deal permanently closed.`,
        link: isFarmer ? '/buyer' : '/farmer',
        metadata: { offerId: offer._id },
      });

      res.json({ success: true, message: 'Offer rejected and deal closed.', offer });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
