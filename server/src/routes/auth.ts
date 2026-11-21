import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { User, IUser } from '../models/User';
import { FarmerProfile } from '../models/FarmerProfile';
import { BuyerProfile } from '../models/BuyerProfile';
import { config } from '../config';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// Rate limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // liberal for demo
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

router.use(authLimiter);

/**
 * Normalizes Ethiopian phone numbers to international standard +251...
 */
export function normalizeEthiopianPhone(phoneRaw: string): string {
  let cleaned = phoneRaw.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('09')) {
    return `+251${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('07')) {
    return `+251${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return `+251${cleaned}`;
  }
  if (cleaned.startsWith('7') && cleaned.length === 9) {
    return `+251${cleaned}`;
  }
  if (cleaned.startsWith('251')) {
    return `+${cleaned}`;
  }
  if (!cleaned.startsWith('+') && cleaned.length >= 9) {
    return `+${cleaned}`;
  }
  return cleaned;
}

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['farmer', 'buyer', 'admin']).default('farmer'),
  preferredLanguage: z.enum(['om', 'am', 'en']).default('om'),
  // Optional profile seed fields
  woreda: z.string().optional(),
  kebele: z.string().optional(),
  companyName: z.string().optional(),
  businessType: z.enum(['exporter', 'cooperative_union', 'roaster', 'local_trader']).optional(),
  tradeLicenseNumber: z.string().optional(),
  tinNumber: z.string().optional(),
});

/**
 * POST /api/v1/auth/register
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = registerSchema.parse(req.body);

    if (!validated.email && !validated.phone) {
      res.status(400).json({
        success: false,
        message: 'Please provide either an email or a phone number to register.',
      });
      return;
    }

    const normalizedPhone = validated.phone ? normalizeEthiopianPhone(validated.phone) : undefined;
    const normalizedEmail = validated.email ? validated.email.toLowerCase().trim() : undefined;

    // Check if phone or email already in use
    if (normalizedEmail) {
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }
    }

    if (normalizedPhone) {
      const existingPhone = await User.findOne({ phone: normalizedPhone });
      if (existingPhone) {
        res.status(409).json({ success: false, message: 'An account with this phone number already exists.' });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    const user = await User.create({
      fullName: validated.fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: validated.role,
      preferredLanguage: validated.preferredLanguage,
      avatar: '',
    });

    // Create corresponding profile
    if (validated.role === 'farmer') {
      await FarmerProfile.create({
        user: user._id,
        fullName: validated.fullName,
        phone: normalizedPhone || '+251 900 000 000',
        email: normalizedEmail,
        region: 'Oromia',
        zone: 'Jimma',
        woreda: validated.woreda || 'Mana',
        kebele: validated.kebele || 'Kenteri',
        farmSizeHectares: 2.5,
        coffeeVarieties: ['Jimma Heirloom', '74110'],
        processingMethods: ['natural', 'washed'],
        preferredLanguage: validated.preferredLanguage,
        averageQualityScore: 85,
        qualityRank: 1,
      });
    } else if (validated.role === 'buyer') {
      await BuyerProfile.create({
        user: user._id,
        companyName: validated.companyName || `${validated.fullName} Coffee Export`,
        ownerName: validated.fullName,
        phone: normalizedPhone || '+251 911 000 000',
        email: normalizedEmail || `${user._id}@bunafairprice.et`,
        businessType: validated.businessType || 'exporter',
        tradeLicenseNumber: validated.tradeLicenseNumber || 'ET-JIM-2024-PENDING',
        tinNumber: validated.tinNumber || '0098765432',
        verificationStatus: 'pending',
        fairnessScore: 85,
        fairnessRank: 1,
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as import('ms').StringValue }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your email or phone number'),
  password: z.string().min(1, 'Please enter your password'),
});

/**
 * POST /api/v1/auth/login
 * Allows either email or phone number in one field!
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    const isEmail = identifier.includes('@');
    let user: IUser | null = null;

    if (isEmail) {
      user = await User.findOne({ email: identifier.toLowerCase().trim() });
    } else {
      const normalizedPhone = normalizeEthiopianPhone(identifier);
      user = await User.findOne({
        $or: [{ phone: normalizedPhone }, { phone: identifier.trim() }],
      });
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'No account found matching this email or phone number.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Incorrect password. Please verify and try again.',
      });
      return;
    }

    // Fetch associated profile details
    let profileData: any = null;
    if (user.role === 'farmer') {
      profileData = await FarmerProfile.findOne({ user: user._id });
    } else if (user.role === 'buyer') {
      profileData = await BuyerProfile.findOne({ user: user._id });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as import('ms').StringValue }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        avatar: user.avatar,
        profile: profileData,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/otp-login
 * Clearly marked phone OTP login placeholder for Ethiopian farmers.
 * Demo stub accepts code "123456".
 */
router.post('/otp-login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone, code } = req.body;

    if (!phone) {
      res.status(400).json({ success: false, message: 'Phone number is required.' });
      return;
    }

    const normalizedPhone = normalizeEthiopianPhone(phone);

    // DEMO STUB: Code "123456" is accepted
    // TODO: Connect real Ethiopian SMS provider (e.g. Ethio Telecom SMS Gateway, Twilio, or Termii)
    if (code !== '123456') {
      res.status(400).json({
        success: false,
        message: 'Invalid SMS verification code. (For hackathon demo, use 123456)',
      });
      return;
    }

    let user = await User.findOne({ phone: normalizedPhone });

    if (!user) {
      // Auto-register farmer on first OTP login
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('buna_otp_farmer_2026', salt);

      user = await User.create({
        fullName: `Farmer ${normalizedPhone.slice(-4)}`,
        phone: normalizedPhone,
        passwordHash,
        role: 'farmer',
        preferredLanguage: 'om',
        avatar: '',
      });

      await FarmerProfile.create({
        user: user._id,
        fullName: user.fullName,
        phone: normalizedPhone,
        region: 'Oromia',
        zone: 'Jimma',
        woreda: 'Mana',
        kebele: 'Kenteri',
        farmSizeHectares: 2.0,
        coffeeVarieties: ['Jimma Heirloom'],
        processingMethods: ['natural', 'washed'],
        preferredLanguage: 'om',
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as import('ms').StringValue }
    );

    res.json({
      success: true,
      message: 'Farmer phone authenticated via OTP stub',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        avatar: user.avatar,
      },
      note: 'In production, SMS OTP is routed via Ethio Telecom Shortcode.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 */
router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    let profileData: any = null;

    if (user.role === 'farmer') {
      profileData = await FarmerProfile.findOne({ user: user._id });
    } else if (user.role === 'buyer') {
      profileData = await BuyerProfile.findOne({ user: user._id });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        avatar: user.avatar,
        profile: profileData,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
