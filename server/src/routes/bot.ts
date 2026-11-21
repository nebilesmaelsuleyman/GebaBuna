import { Router, Request, Response, NextFunction } from 'express';
import { requireBotApiKey } from '../middleware/botAuthMiddleware';
import { Listing } from '../models/Listing';
import { User } from '../models/User';
import { FarmerProfile } from '../models/FarmerProfile';
import { MarketPrice } from '../models/MarketPrice';
import { getMarketReferencePrice, evaluatePriceFairness } from '../services/marketPriceService';
import { normalizeEthiopianPhone } from './auth';

const router = Router();

// Protect all bot endpoints with API Key
router.use(requireBotApiKey);

/**
 * POST /api/v1/bot/listings
 * API-key-protected endpoint for listings created from the Telegram bot
 */
router.post('/listings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      farmerPhone,
      farmerName,
      coffeeType = 'Jimma Heirloom Natural',
      processing = 'natural',
      grade = 'Grade 1',
      quantityKg = 500,
      askingPricePerKg,
      woreda = 'Mana',
      kebele = 'Kenteri',
      description = 'Listed via BunaJimma Telegram Bot',
      photos = [],
      moisturePercentage = 11.5,
      aiEstimatedGrade = '',
      aiConfidence = '',
      aiDefectsSummary = '',
    } = req.body;

    if (!farmerPhone) {
      res.status(400).json({ success: false, message: 'farmerPhone is required for bot listings' });
      return;
    }

    const normalizedPhone = normalizeEthiopianPhone(farmerPhone);

    // Find or create farmer user
    let user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      user = await User.create({
        fullName: farmerName || `Jimma Farmer (${normalizedPhone.slice(-4)})`,
        phone: normalizedPhone,
        passwordHash: '$2a$10$botCreatedListingPasswordPlaceholderHashDemoOnly',
        role: 'farmer',
        preferredLanguage: 'om',
        avatar: '',
      });
    }

    let farmerProfile = await FarmerProfile.findOne({ user: user._id });
    if (!farmerProfile) {
      farmerProfile = await FarmerProfile.create({
        user: user._id,
        fullName: user.fullName,
        phone: normalizedPhone,
        region: 'Oromia',
        zone: 'Jimma',
        woreda,
        kebele,
        farmSizeHectares: 2.0,
        coffeeVarieties: [coffeeType],
        processingMethods: [processing],
        preferredLanguage: 'om',
      });
    }

    const refPrice = await getMarketReferencePrice(processing, grade);
    const finalPrice = askingPricePerKg || refPrice;
    const fairness = evaluatePriceFairness(finalPrice, refPrice);

    const listing = await Listing.create({
      farmer: user._id,
      farmerProfile: farmerProfile._id,
      coffeeType,
      processing,
      grade,
      quantityKg,
      askingPricePerKg: finalPrice,
      harvestDate: 'Current Harvest / Tahsas 2017',
      location: {
        region: 'Oromia',
        zone: 'Jimma',
        woreda,
        kebele,
      },
      photos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80'],
      description: `${description} [Telegram Bot Entry]`,
      source: 'telegram',
      status: 'open',
      moisturePercentage,
      aiEstimatedGrade: aiEstimatedGrade || grade,
      aiConfidence: aiConfidence || 'High',
      aiDefectsSummary: aiDefectsSummary || 'Graded by BunaJimma AI Vision',
      marketReferencePrice: refPrice,
      priceFairnessDiff: fairness.diff,
      priceFairnessStatus: fairness.status,
    });

    res.status(201).json({
      success: true,
      message: 'Listing successfully created via Telegram Bot API',
      listing,
      fairness,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/bot/prices
 * Telegram bot fetches live benchmark prices to present in Afaan Oromoo / Amharic
 */
router.get('/prices', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prices = await MarketPrice.find().sort({ processing: 1, grade: 1 });
    res.json({
      success: true,
      count: prices.length,
      prices: prices.map((p) => ({
        coffeeType: p.coffeeType,
        processing: p.processing,
        grade: p.grade,
        pricePerKgETB: p.currentPricePerKgETB,
        source: p.source,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
