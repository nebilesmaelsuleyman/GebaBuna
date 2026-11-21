import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import fs from 'fs';
import { FarmerProfile } from '../models/FarmerProfile';
import { AiUnavailableError, gradeCoffeeImage, NotCoffeeImageError } from '../services/coffeeGraderService';

const router = Router();

async function farmerLocation(req: AuthenticatedRequest) {
  const farmerProfile = await FarmerProfile.findOne({ user: req.user!._id }).select('region zone woreda kebele');
  return {
    region: farmerProfile?.region || 'Oromia',
    zone: farmerProfile?.zone || 'Jimma',
    woreda: String(req.body.woreda || farmerProfile?.woreda || '').trim(),
    kebele: String(req.body.kebele || farmerProfile?.kebele || '').trim(),
  };
}

/**
 * Gemini is the only grader. When it cannot grade the photo the client switches to manual grade and
 * price entry, so the photo URL is still returned for the listing.
 */
function sendGradingFailure(res: Response, err: unknown, photoUrl: string): boolean {
  if (err instanceof AiUnavailableError) {
    res.status(503).json({ success: false, aiUnavailable: true, message: err.message, photoUrl });
    return true;
  }
  if (err instanceof NotCoffeeImageError) {
    res.status(422).json({ success: false, notCoffee: true, message: err.message, photoUrl });
    return true;
  }
  return false;
}

/**
 * POST /api/v1/ai/analyze-coffee
 * Upload coffee bean photo and get AI analysis
 */
router.post('/analyze-coffee', authenticateJWT, upload.single('photo'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No photo uploaded' });
    return;
  }
  const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  try {
    const result = await gradeCoffeeImage(await fs.promises.readFile(req.file.path), req.file.mimetype || 'image/jpeg');
    const location = await farmerLocation(req);
    res.json({
      success: true,
      message: 'AI analysis complete',
      photoUrl,
      analysis: { ...result, location },
      location,
    });
  } catch (err) {
    if (!sendGradingFailure(res, err, photoUrl)) next(err);
  }
});

/**
 * POST /api/v1/ai/analyze-coffee-url
 * Analyze coffee bean photo from URL (for Telegram bot integration)
 */
router.post('/analyze-coffee-url', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    res.status(400).json({ success: false, message: 'Image URL is required' });
    return;
  }

  try {
    const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imageResponse.ok) {
      res.status(400).json({ success: false, message: `Could not download the image (HTTP ${imageResponse.status}).` });
      return;
    }
    const result = await gradeCoffeeImage(
      Buffer.from(await imageResponse.arrayBuffer()),
      (imageResponse.headers.get('content-type') || 'image/jpeg').split(';')[0],
    );
    const location = await farmerLocation(req);
    res.json({
      success: true,
      message: 'AI analysis complete',
      photoUrl: imageUrl,
      analysis: { ...result, location },
      location,
    });
  } catch (err) {
    if (!sendGradingFailure(res, err, imageUrl)) next(err);
  }
});

export default router;
