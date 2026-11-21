import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const requireBotApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = (req.headers['x-api-key'] || req.headers['X-API-KEY']) as string;

  if (!apiKey || apiKey !== config.botApiKey) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized Telegram bot request. Invalid or missing X-API-KEY header.',
    });
    return;
  }

  next();
};
