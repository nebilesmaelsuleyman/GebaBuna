import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest, requireRoles } from '../middleware/authMiddleware';
import { Listing, IListing } from '../models/Listing';
import { FarmerProfile } from '../models/FarmerProfile';
import { getMarketReferencePrice, evaluatePriceFairness } from '../services/marketPriceService';
import { upload, getFileUrl } from '../middleware/uploadMiddleware';

const router = Router();

/**
 * GET /api/v1/listings
 * Marketplace search & filters for buyers
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      grade,
      processing,
      woreda,
      minPrice,
      maxPrice,
      minQuantity,
      maxQuantity,
      status = 'open',
      search,
      sort = 'newest',
      page = '1',
      limit = '12',
    } = req.query;

    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (grade && grade !== 'all') {
      query.grade = grade;
    }

    if (processing && processing !== 'all') {
      query.processing = processing;
    }

    if (woreda && woreda !== 'all') {
      query['location.woreda'] = new RegExp(String(woreda), 'i');
    }

    if (minPrice || maxPrice) {
      query.askingPricePerKg = {};
      if (minPrice) query.askingPricePerKg.$gte = Number(minPrice);
      if (maxPrice) query.askingPricePerKg.$lte = Number(maxPrice);
    }

    if (minQuantity || maxQuantity) {
      query.quantityKg = {};
      if (minQuantity) query.quantityKg.$gte = Number(minQuantity);
      if (maxQuantity) query.quantityKg.$lte = Number(maxQuantity);
    }

    if (search) {
      const s = String(search).trim();
      query.$or = [
        { coffeeType: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
        { 'location.woreda': { $regex: s, $options: 'i' } },
        { 'location.kebele': { $regex: s, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    if (sort === 'price_asc') sortOptions.askingPricePerKg = 1;
    else if (sort === 'price_desc') sortOptions.askingPricePerKg = -1;
    else if (sort === 'quantity_desc') sortOptions.quantityKg = -1;
    else sortOptions.createdAt = -1; // newest

    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 12;
    const skip = (pageNum - 1) * limitNum;

    const [listings, totalCount] = await Promise.all([
      Listing.find(query)
        .populate('farmer', 'fullName phone avatar')
        .populate('farmerProfile', 'averageQualityScore qualityRank totalKgSold averageRatingFromBuyers woreda kebele')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Listing.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/listings/my
 * Farmer's own listings
 */
router.get('/my', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listings = await Listing.find({ farmer: req.user!._id }).sort({ createdAt: -1 });
    res.json({ success: true, listings });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/listings/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('farmer', 'fullName phone email avatar preferredLanguage')
      .populate('farmerProfile', '-estimatedCostPerKg');

    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found.' });
      return;
    }

    // Refresh live market fairness
    const currentMarketPrice = await getMarketReferencePrice(listing.processing, listing.grade);
    const analysis = evaluatePriceFairness(listing.askingPricePerKg, currentMarketPrice);

    res.json({
      success: true,
      listing,
      marketAnalysis: analysis,
    });
  } catch (err) {
    next(err);
  }
});

const createListingSchema = z.object({
  coffeeType: z.string().default('Jimma Heirloom Specialty'),
  processing: z.enum(['washed', 'natural']),
  grade: z.enum(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Specialty']),
  quantityKg: z.coerce.number().min(1, 'Quantity must be at least 1 kg'),
  askingPricePerKg: z.coerce.number().positive('Asking price must be a positive number'),
  harvestDate: z.string().default('November 2024 / Tahsas 2017'),
  woreda: z.string().min(1, 'Woreda is required'),
  kebele: z.string().min(1, 'Kebele is required'),
  description: z.string().optional().default(''),
  moisturePercentage: z.coerce.number().min(8).max(18).default(11.5),
  photos: z.array(z.string()).optional().default([]),
  aiEstimatedGrade: z.string().optional(),
  aiConfidence: z.string().optional(),
  aiDefectsSummary: z.string().optional(),
});

/**
 * POST /api/v1/listings
 * Farmer creates listing with market reference price checks
 */
router.post(
  '/',
  authenticateJWT,
  requireRoles(['farmer']),
  upload.array('images', 4),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = createListingSchema.parse(req.body);

      // Handle uploaded files if any
      const uploadedPhotos: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const f of req.files) {
          uploadedPhotos.push(getFileUrl(f.filename));
        }
      }

      // Merge with photo URLs from body if provided
      const photos = [...uploadedPhotos, ...(validated.photos || [])].slice(0, 4);

      // Retrieve farmer profile
      const farmerProfile = await FarmerProfile.findOne({ user: req.user!._id });

      // Calculate market reference price & fairness indicator
      const refPrice = await getMarketReferencePrice(validated.processing, validated.grade);
      const fairness = evaluatePriceFairness(validated.askingPricePerKg, refPrice);

      const listing = await Listing.create({
        farmer: req.user!._id,
        farmerProfile: farmerProfile?._id,
        coffeeType: validated.coffeeType,
        processing: validated.processing,
        grade: validated.grade,
        quantityKg: validated.quantityKg,
        askingPricePerKg: validated.askingPricePerKg,
        harvestDate: validated.harvestDate,
        location: {
          region: 'Oromia',
          zone: 'Jimma',
          woreda: validated.woreda || farmerProfile?.woreda || 'Mana',
          kebele: validated.kebele || farmerProfile?.kebele || 'Kenteri',
        },
        photos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80'],
        description: validated.description,
        source: 'web',
        status: 'open',
        moisturePercentage: validated.moisturePercentage,
        aiEstimatedGrade: validated.aiEstimatedGrade || '',
        aiConfidence: validated.aiConfidence || '',
        aiDefectsSummary: validated.aiDefectsSummary || '',
        marketReferencePrice: refPrice,
        priceFairnessDiff: fairness.diff,
        priceFairnessStatus: fairness.status,
      });

      res.status(201).json({
        success: true,
        message: 'Coffee listing published successfully',
        listing,
        fairnessWarning: fairness,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/listings/:id
 */
router.put('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, farmer: req.user!._id });
    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found or unauthorized' });
      return;
    }
    if (listing.status === 'sold' || listing.status === 'cancelled') {
      res.status(409).json({ success: false, message: `A ${listing.status} listing cannot be edited.` });
      return;
    }

    const allowed: Record<string, unknown> = {};
    for (const field of ['coffeeType', 'grade', 'processing', 'harvestDate', 'description'] as const) {
      if (typeof req.body[field] === 'string') allowed[field] = req.body[field].trim();
    }
    for (const field of ['quantityKg', 'askingPricePerKg', 'moisturePercentage'] as const) {
      if (req.body[field] !== undefined) {
        const value = Number(req.body[field]);
        if (!Number.isFinite(value) || value <= 0 || (field === 'moisturePercentage' && value > 18)) {
          res.status(400).json({ success: false, message: `Invalid ${field}.` });
          return;
        }
        allowed[field] = value;
      }
    }
    const woreda = typeof req.body.woreda === 'string' ? req.body.woreda.trim() : listing.location.woreda;
    const kebele = typeof req.body.kebele === 'string' ? req.body.kebele.trim() : listing.location.kebele;
    if (!woreda || !kebele) {
      res.status(400).json({ success: false, message: 'Woreda and kebele are required.' });
      return;
    }
    allowed.location = {
      region: listing.location.region,
      zone: listing.location.zone,
      woreda,
      kebele,
    };

    if (allowed.askingPricePerKg !== undefined || allowed.grade || allowed.processing) {
      const proc = (allowed.processing as any) || listing.processing;
      const grd = (allowed.grade as any) || listing.grade;
      const price = (allowed.askingPricePerKg as number) || listing.askingPricePerKg;
      const refPrice = await getMarketReferencePrice(proc, grd);
      const fairness = evaluatePriceFairness(price, refPrice);
      allowed.marketReferencePrice = refPrice;
      allowed.priceFairnessDiff = fairness.diff;
      allowed.priceFairnessStatus = fairness.status;
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true, runValidators: true });
    res.json({ success: true, listing: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/listings/:id
 */
router.delete('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, farmer: req.user!._id });
    if (!listing) {
      res.status(404).json({ success: false, message: 'Listing not found or unauthorized' });
      return;
    }
    if (listing.status === 'sold') {
      res.status(409).json({ success: false, message: 'A sold listing cannot be removed.' });
      return;
    }

    listing.status = 'cancelled';
    await listing.save();

    res.json({ success: true, message: 'Listing cancelled' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/listings/:id/ai-grade
 * Hook for AI coffee bean grader integration
 */
router.post('/:id/ai-grade', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { estimatedGrade, confidence, defectsSummary } = req.body;
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          aiEstimatedGrade: estimatedGrade,
          aiConfidence: confidence,
          aiDefectsSummary: defectsSummary,
        },
      },
      { new: true }
    );
    res.json({ success: true, message: 'AI bean grade registered', listing });
  } catch (err) {
    next(err);
  }
});

export default router;
