import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/authMiddleware';
import { Trade } from '../models/Trade';
import { FarmerProfile } from '../models/FarmerProfile';
import { BuyerProfile } from '../models/BuyerProfile';
import { createNotification } from '../services/notificationService';

const router = Router();

/**
 * GET /api/v1/trades
 * List all trades for current farmer or buyer
 */
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isFarmer = req.user!.role === 'farmer';
    const query = isFarmer ? { farmer: req.user!._id } : { buyer: req.user!._id };

    const trades = await Trade.find(query)
      .populate('listing', 'coffeeType grade processing photos location marketReferencePrice')
      .populate('farmer', 'fullName phone email avatar')
      .populate('buyer', 'fullName phone email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, trades });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/trades/bilateral/:otherUserId
 * History of all trades done between the authenticated user and another farmer/buyer
 */
router.get(
  '/bilateral/:otherUserId',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const currentUserId = req.user!._id;
      const otherUserId = req.params.otherUserId;

      const trades = await Trade.find({
        $or: [
          { farmer: currentUserId, buyer: otherUserId },
          { buyer: currentUserId, farmer: otherUserId },
        ],
      })
        .populate('listing', 'coffeeType grade processing askingPricePerKg quantityKg photos location harvestYear')
        .populate('farmer', 'fullName phone email avatar')
        .populate('buyer', 'fullName phone email avatar')
        .sort({ createdAt: -1 });

      const completedTrades = trades.filter((t) => ['completed', 'paid', 'delivered'].includes(t.status));
      const totalKgTraded = completedTrades.reduce((sum, t) => sum + (t.agreedQuantityKg || 0), 0);
      const totalETBTraded = completedTrades.reduce((sum, t) => sum + (t.totalAmountETB || 0), 0);
      const averagePricePerKg = totalKgTraded > 0 ? Math.round(totalETBTraded / totalKgTraded) : 0;

      res.json({
        success: true,
        trades,
        summary: {
          totalTradesCount: trades.length,
          completedTradesCount: completedTrades.length,
          totalKgTraded,
          totalETBTraded,
          averagePricePerKg,
          lastTradeDate: trades.length > 0 ? trades[0].createdAt : null,
          isEstablishedPartner: completedTrades.length > 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/trades/:id
 */
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('listing')
      .populate('farmer', 'fullName phone email avatar')
      .populate('buyer', 'fullName phone email avatar');

    if (!trade) {
      res.status(404).json({ success: false, message: 'Trade not found.' });
      return;
    }

    const isFarmer = trade.farmer._id.toString() === req.user!._id.toString();
    const isBuyer = trade.buyer._id.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isFarmer && !isBuyer && !isAdmin) {
      res.status(403).json({ success: false, message: 'Unauthorized to view this trade.' });
      return;
    }

    res.json({ success: true, trade });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/trades/:id/confirm-delivery
 */
router.post(
  '/:id/confirm-delivery',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { deliveryNotes } = req.body;
      const trade = await Trade.findById(req.params.id);

      if (!trade) {
        res.status(404).json({ success: false, message: 'Trade not found.' });
        return;
      }

      const isFarmer = trade.farmer.toString() === req.user!._id.toString();
      const isBuyer = trade.buyer.toString() === req.user!._id.toString();

      if (!isFarmer && !isBuyer) {
        res.status(403).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      if (isFarmer) {
        trade.deliveryConfirmedByFarmer = true;
      }
      if (isBuyer) {
        trade.deliveryConfirmedByBuyer = true;
      }
      if (deliveryNotes) trade.deliveryNotes = deliveryNotes;

      // If both sides confirm delivery
      if (trade.deliveryConfirmedByFarmer && trade.deliveryConfirmedByBuyer) {
        trade.deliveryConfirmedAt = new Date();
        if (trade.status === 'agreed') {
          trade.status = 'delivered';
        }
      }

      await trade.save();

      const notifyTarget = isFarmer ? trade.buyer : trade.farmer;
      await createNotification({
        recipient: notifyTarget,
        type: 'delivery_confirmed',
        title: 'Delivery Confirmed',
        message: `${req.user!.fullName} confirmed coffee beans delivery. Both parties confirmation status: Farmer (${trade.deliveryConfirmedByFarmer ? '✓' : 'Pending'}), Buyer (${trade.deliveryConfirmedByBuyer ? '✓' : 'Pending'}).`,
        link: `/trades/${trade._id}`,
        metadata: { tradeId: trade._id },
      });

      res.json({
        success: true,
        message: 'Delivery step confirmed',
        trade,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/trades/:id/confirm-payment
 * Note: Payment is recorded as confirmed by both parties.
 * TODO: Integrate Telebirr merchant API & CBE Birr direct payment gateway.
 */
router.post(
  '/:id/confirm-payment',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentNotes, paymentMethod } = req.body;
      const trade = await Trade.findById(req.params.id);

      if (!trade) {
        res.status(404).json({ success: false, message: 'Trade not found.' });
        return;
      }

      const isFarmer = trade.farmer.toString() === req.user!._id.toString();
      const isBuyer = trade.buyer.toString() === req.user!._id.toString();

      if (!isFarmer && !isBuyer) {
        res.status(403).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      if (isFarmer) {
        trade.paymentConfirmedByFarmer = true;
      }
      if (isBuyer) {
        trade.paymentConfirmedByBuyer = true;
      }
      if (paymentNotes) trade.paymentNotes = paymentNotes;
      if (paymentMethod) trade.paymentMethod = paymentMethod;

      // If both confirmed payment, mark as paid / completed
      if (trade.paymentConfirmedByFarmer && trade.paymentConfirmedByBuyer) {
        trade.paymentConfirmedAt = new Date();
        trade.status = 'completed';
        trade.completedAt = new Date();

        // Increment stats for both sides
        await FarmerProfile.findOneAndUpdate(
          { user: trade.farmer },
          {
            $inc: {
              totalKgSold: trade.agreedQuantityKg,
              numberCompletedTrades: 1,
            },
          }
        );

        await BuyerProfile.findOneAndUpdate(
          { user: trade.buyer },
          {
            $inc: {
              totalKgBought: trade.agreedQuantityKg,
              numberCompletedTrades: 1,
            },
          }
        );

        // Notify both parties that deal is completed and report cards can be generated!
        await createNotification({
          recipient: trade.farmer,
          type: 'trade_completed',
          title: 'Trade Completed! 🌟 Rate Buyer & View Report Card',
          message: `Trade for ${trade.agreedQuantityKg} kg completed. Please submit your fairness report card.`,
          link: `/trades/${trade._id}/report-card`,
          metadata: { tradeId: trade._id },
        });

        await createNotification({
          recipient: trade.buyer,
          type: 'trade_completed',
          title: 'Trade Completed! 🌟 Rate Farmer & View Report Card',
          message: `Trade for ${trade.agreedQuantityKg} kg completed. Please confirm coffee quality delivered.`,
          link: `/trades/${trade._id}/report-card`,
          metadata: { tradeId: trade._id },
        });
      }

      await trade.save();

      res.json({
        success: true,
        message: 'Payment step updated',
        trade,
        note: 'Payment recorded. In production, verified through Telebirr or CBE Birr webhooks.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
