import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser, UserRole } from '../models/User';
import { BuyerProfile } from '../models/BuyerProfile';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  buyerProfile?: any;
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers.cookie) {
      // Cookie parsing fallback
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [k, v] = cookie.trim().split('=');
        if (k === 'token') {
          token = v;
          break;
        }
      }
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: UserRole };
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid or inactive user account.' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
};

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}.`,
      });
      return;
    }

    next();
  };
};

/**
 * Ensures buyer is verified by the Regional Agriculture Bureau before submitting offers or purchasing
 */
export const requireVerifiedBuyer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || req.user.role !== 'buyer') {
    res.status(403).json({ success: false, message: 'Only registered buyers can perform this action.' });
    return;
  }

  const profile = await BuyerProfile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(404).json({ success: false, message: 'Buyer profile not found. Please complete profile.' });
    return;
  }

  if (profile.verificationStatus !== 'verified') {
    res.status(403).json({
      success: false,
      verificationStatus: profile.verificationStatus,
      message:
        'Access denied: Only buyers officially verified by the Jimma Regional Agriculture Bureau can submit offers or finalize trades. Your current status is: ' +
        profile.verificationStatus.toUpperCase(),
    });
    return;
  }

  req.buyerProfile = profile;
  next();
};
