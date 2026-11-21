import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, optionalAuthenticateJWT, AuthenticatedRequest, requireRoles } from '../middleware/authMiddleware';
import { FarmerProfile } from '../models/FarmerProfile';
import { BuyerProfile } from '../models/BuyerProfile';
import { User } from '../models/User';
import { Trade } from '../models/Trade';
import { upload, getFileUrl } from '../middleware/uploadMiddleware';
import fs from 'fs';

const router = Router();

/**
 * GET /api/v1/profiles/farmer/me
 */
router.get('/farmer/me', authenticateJWT, requireRoles(['farmer']), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await FarmerProfile.findOne({ user: req.user!._id }).populate('user', 'fullName phone email avatar');
    if (!profile) {
      res.status(404).json({ success: false, message: 'Farmer profile not found.' });
      return;
    }
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/profiles/farmer/me
 */
router.put('/farmer/me', authenticateJWT, requireRoles(['farmer']), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await FarmerProfile.findOne({ user: req.user!._id });
    const user = await User.findById(req.user!._id);
    if (!profile || !user) {
      res.status(404).json({ success: false, message: 'Farmer profile not found.' });
      return;
    }

    const allowedStrings = ['fullName', 'phone', 'email', 'shortBio', 'region', 'zone', 'woreda', 'kebele', 'cooperativeMembership'] as const;
    const updates: Record<string, any> = {};
    for (const field of allowedStrings) {
      if (typeof req.body[field] === 'string') updates[field] = req.body[field].trim();
    }
    for (const field of ['farmSizeHectares', 'numberOfTrees', 'estimatedCostPerKg'] as const) {
      if (field === 'estimatedCostPerKg' && req.body[field] === null) {
        updates[field] = undefined;
        continue;
      }
      if (req.body[field] !== undefined && req.body[field] !== '') {
        const value = Number(req.body[field]);
        if (!Number.isFinite(value) || value < 0) {
          res.status(400).json({ success: false, message: `${field} must be a non-negative number.` });
          return;
        }
        updates[field] = value;
      }
    }
    for (const field of ['coffeeVarieties', 'processingMethods', 'certifications'] as const) {
      if (Array.isArray(req.body[field]) && req.body[field].every((item: unknown) => typeof item === 'string')) {
        updates[field] = req.body[field].map((item: string) => item.trim()).filter(Boolean);
      }
    }
    if (updates.processingMethods?.some((method: string) => !['washed', 'natural', 'honey'].includes(method))) {
      res.status(400).json({ success: false, message: 'Processing methods must be washed, natural, or honey.' });
      return;
    }
    if (['om', 'am', 'en'].includes(req.body.preferredLanguage)) updates.preferredLanguage = req.body.preferredLanguage;
    if (updates.fullName) user.fullName = updates.fullName;
    if (updates.phone) user.phone = updates.phone;
    if (updates.preferredLanguage) user.preferredLanguage = updates.preferredLanguage;

    const email = updates.email?.toLowerCase();
    if (updates.phone) {
      const duplicatePhone = await User.findOne({ phone: updates.phone, _id: { $ne: user._id } });
      if (duplicatePhone) {
        res.status(409).json({ success: false, message: 'That phone number is already in use.' });
        return;
      }
    }
    if (email) {
      const duplicate = await User.findOne({ email, _id: { $ne: user._id } });
      if (duplicate) {
        res.status(409).json({ success: false, message: 'That email address is already in use.' });
        return;
      }
      user.email = email;
      updates.email = email;
    } else if (updates.email === '') {
      user.email = undefined;
      updates.email = undefined;
    }

    Object.assign(profile, updates);
    await Promise.all([profile.save(), user.save()]);
    const savedProfile = await FarmerProfile.findById(profile._id).populate('user', 'fullName phone email avatar');
    res.json({ success: true, message: 'Farmer profile updated', profile: savedProfile });
  } catch (err) {
    next(err);
  }
});

router.post('/farmer/me/photo', authenticateJWT, requireRoles(['farmer']), upload.single('photo'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file || !req.file.mimetype.startsWith('image/')) {
      if (req.file) fs.unlink(req.file.path, () => undefined);
      res.status(400).json({ success: false, message: 'Please upload a JPG, PNG, or WebP image.' });
      return;
    }
    const photo = `${req.protocol}://${req.get('host')}${getFileUrl(req.file.filename)}`;
    const [profile, user] = await Promise.all([
      FarmerProfile.findOneAndUpdate({ user: req.user!._id }, { $set: { photo } }, { new: true }),
      User.findByIdAndUpdate(req.user!._id, { $set: { avatar: photo } }, { new: true }),
    ]);
    res.json({ success: true, photo, profile, user: user ? { id: user._id, avatar: user.avatar } : undefined });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/profiles/buyer/me
 */
router.get('/buyer/me', authenticateJWT, requireRoles(['buyer']), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await BuyerProfile.findOne({ user: req.user!._id }).populate('user', 'fullName phone email avatar');
    if (!profile) {
      res.status(404).json({ success: false, message: 'Buyer profile not found.' });
      return;
    }
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/profiles/buyer/me
 */
router.put('/buyer/me', authenticateJWT, requireRoles(['buyer']), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profile = await BuyerProfile.findOne({ user: req.user!._id });
    const user = await User.findById(req.user!._id);
    if (!profile || !user) {
      res.status(404).json({ success: false, message: 'Buyer profile not found.' });
      return;
    }

    const stringFields = ['companyName', 'ownerName', 'phone', 'email', 'businessType', 'region', 'zone', 'address', 'tradeLicenseNumber', 'exportLicenseNumber', 'tinNumber', 'preferredVolumes'] as const;
    const updates: Record<string, any> = {};
    for (const field of stringFields) if (typeof req.body[field] === 'string') updates[field] = req.body[field].trim();
    if (updates.businessType && !['exporter', 'cooperative_union', 'roaster', 'local_trader'].includes(updates.businessType)) {
      res.status(400).json({ success: false, message: 'Choose a valid buyer organization type.' });
      return;
    }
    if (req.body.yearsInBusiness !== undefined && req.body.yearsInBusiness !== '') {
      const years = Number(req.body.yearsInBusiness);
      if (!Number.isInteger(years) || years < 0 || years > 150) {
        res.status(400).json({ success: false, message: 'Years in business must be a whole number from 0 to 150.' });
        return;
      }
      updates.yearsInBusiness = years;
    }
    if (Array.isArray(req.body.preferredCoffeeTypes) && req.body.preferredCoffeeTypes.every((item: unknown) => typeof item === 'string')) {
      updates.preferredCoffeeTypes = req.body.preferredCoffeeTypes.map((item: string) => item.trim()).filter(Boolean);
    }
    const email = updates.email?.toLowerCase();
    if (email) {
      const duplicate = await User.findOne({ email, _id: { $ne: user._id } });
      if (duplicate) {
        res.status(409).json({ success: false, message: 'That email address is already in use.' });
        return;
      }
      user.email = email;
      updates.email = email;
    }
    if (updates.ownerName) user.fullName = updates.ownerName;
    if (updates.phone) user.phone = updates.phone;
    if (updates.tradeLicenseNumber || updates.tinNumber || updates.exportLicenseNumber || updates.businessType) {
      updates.verificationStatus = 'pending';
      profile.rejectionReason = '';
    }
    Object.assign(profile, updates);
    await Promise.all([profile.save(), user.save()]);
    const savedProfile = await BuyerProfile.findById(profile._id).populate('user', 'fullName phone email avatar');
    res.json({ success: true, message: 'Buyer profile updated', profile: savedProfile });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/profiles/buyer/upload-document
 */
router.post(
  '/buyer/upload-document',
  authenticateJWT,
  requireRoles(['buyer']),
  upload.single('document'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No document file provided.' });
        return;
      }

      const fileUrl = `${req.protocol}://${req.get('host')}${getFileUrl(req.file.filename)}`;
      const docType = req.body.docType || 'trade_license';
      const title = req.body.title || req.file.originalname;
      if (!['trade_license', 'export_license', 'tin_certificate', 'tax_clearance', 'other'].includes(docType)) {
        fs.unlink(req.file.path, () => undefined);
        res.status(400).json({ success: false, message: 'Choose a valid document type.' });
        return;
      }

      const profile = await BuyerProfile.findOneAndUpdate(
        { user: req.user!._id },
        {
          $push: {
            uploadedDocuments: {
              title,
              fileUrl,
              docType,
              uploadedAt: new Date(),
            },
          },
          $set: { verificationStatus: 'pending' },
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Document uploaded successfully and queued for System Admin verification.',
        fileUrl,
        profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/profiles/public/:userId
 * Public stats and profile view for both farmers and buyers
 */
router.get('/public/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId).select('fullName role avatar createdAt');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    let profile: any = null;
    if (user.role === 'farmer') {
      profile = await FarmerProfile.findOne({ user: user._id }).select('-estimatedCostPerKg');
    } else if (user.role === 'buyer') {
      profile = await BuyerProfile.findOne({ user: user._id }).select('-verificationChecklist -adminNotes');
    }

    res.json({
      success: true,
      user,
      profile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/profiles/traceability/:userId
 * Full traceability profile including proven platform trade log and bilateral history
 */
router.get(
  '/traceability/:userId',
  optionalAuthenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetUser = await User.findById(req.params.userId).select('fullName role avatar phone email createdAt');
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      let profile: any = null;
      if (targetUser.role === 'farmer') {
        profile = await FarmerProfile.findOne({ user: targetUser._id }).select('-estimatedCostPerKg');
      } else if (targetUser.role === 'buyer') {
        profile = await BuyerProfile.findOne({ user: targetUser._id }).select('-verificationChecklist -adminNotes');
      }

      // Query all completed trades on the platform for this user
      const isFarmerTarget = targetUser.role === 'farmer';
      const tradeQuery = isFarmerTarget
        ? { farmer: targetUser._id, status: { $in: ['completed', 'paid', 'delivered', 'agreed'] } }
        : { buyer: targetUser._id, status: { $in: ['completed', 'paid', 'delivered', 'agreed'] } };

      const allTrades = await Trade.find(tradeQuery)
        .populate('listing', 'coffeeType grade processing quantityKg photos location')
        .populate('farmer', 'fullName phone avatar')
        .populate('buyer', 'fullName phone avatar')
        .sort({ completedAt: -1, createdAt: -1 });

      const completedOnly = allTrades.filter((t) => ['completed', 'paid'].includes(t.status));
      const totalKgTraded = completedOnly.reduce((sum, t) => sum + (t.agreedQuantityKg || 0), 0);
      const totalETBTraded = completedOnly.reduce((sum, t) => sum + (t.totalAmountETB || 0), 0);

      // Check bilateral trades with currently logged-in user if available
      let bilateralTrades: any[] = [];
      let bilateralSummary = {
        totalTradesCount: 0,
        completedTradesCount: 0,
        totalKgTraded: 0,
        totalETBTraded: 0,
        averagePricePerKg: 0,
        lastTradeDate: null as Date | null,
        isEstablishedPartner: false,
      };

      if (req.user && req.user._id.toString() !== targetUser._id.toString()) {
        const requesterId = req.user._id;
        bilateralTrades = await Trade.find({
          $or: [
            { farmer: requesterId, buyer: targetUser._id },
            { buyer: requesterId, farmer: targetUser._id },
          ],
        })
          .populate('listing', 'coffeeType grade processing quantityKg photos location harvestYear')
          .sort({ createdAt: -1 });

        const bilateralCompleted = bilateralTrades.filter((t) => ['completed', 'paid', 'delivered'].includes(t.status));
        const bilateralKg = bilateralCompleted.reduce((sum, t) => sum + (t.agreedQuantityKg || 0), 0);
        const bilateralETB = bilateralCompleted.reduce((sum, t) => sum + (t.totalAmountETB || 0), 0);

        bilateralSummary = {
          totalTradesCount: bilateralTrades.length,
          completedTradesCount: bilateralCompleted.length,
          totalKgTraded: bilateralKg,
          totalETBTraded: bilateralETB,
          averagePricePerKg: bilateralKg > 0 ? Math.round(bilateralETB / bilateralKg) : 0,
          lastTradeDate: bilateralTrades.length > 0 ? bilateralTrades[0].createdAt : null,
          isEstablishedPartner: bilateralCompleted.length > 0,
        };
      }

      res.json({
        success: true,
        user: targetUser,
        profile,
        traceability: {
          totalTradesCount: allTrades.length,
          completedTradesCount: completedOnly.length,
          totalKgTraded,
          totalETBTraded,
          completedTrades: allTrades,
        },
        bilateral: bilateralSummary,
        bilateralTrades,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
