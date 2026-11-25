import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redisService';
import { config } from '../config';

interface CacheOptions {
  ttlSeconds?: number;
  prefix?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Express middleware to cache GET requests in Redis with in-memory fallback.
 * Sends X-Cache (HIT/MISS) and X-Cache-Provider headers for full observability.
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const ttl = options.ttlSeconds ?? config.redisTtlDefault;
  const prefix = options.prefix || 'cache';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Allow clients to bypass cache with Cache-Control: no-cache
    if (req.headers['cache-control'] === 'no-cache') {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : `${prefix}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await redisService.get(key);

      if (cachedData !== null) {
        const status = await redisService.getStatus();
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Provider', status.provider);
        res.setHeader('X-Cache-Key', key);
        res.json(cachedData);
        return;
      }

      // Cache MISS: intercept res.json to capture response
      res.setHeader('X-Cache', 'MISS');
      const originalJson = res.json.bind(res);

      res.json = (body: any): Response => {
        // Only cache successful 2xx responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisService.set(key, body, ttl).catch((err) => {
            console.warn(`[Cache] Failed to set cache key "${key}":`, err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.warn('[Cache Middleware Error]:', err);
      next();
    }
  };
};

/**
 * Utility to invalidate specific patterns across Redis & memory fallback.
 */
export const invalidateCache = async (patterns: string[]): Promise<void> => {
  for (const pattern of patterns) {
    try {
      await redisService.delPattern(pattern);
    } catch (err: any) {
      console.warn(`[Cache Invalidation] Failed to invalidate pattern "${pattern}":`, err.message);
    }
  }
};
