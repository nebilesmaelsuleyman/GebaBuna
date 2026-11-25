import Redis from 'ioredis';
import { config } from '../config';

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

class MemoryStore {
  private store = new Map<string, { value: string; expiry: number | null }>();

  get(key: string): string | null {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  del(key: string): boolean {
    return this.store.delete(key);
  }

  delPattern(pattern: string): number {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  flush(): void {
    this.store.clear();
  }

  size(): number {
    // Clean expired keys before returning size
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (item.expiry && now > item.expiry) {
        this.store.delete(key);
      }
    }
    return this.store.size;
  }
}

export class RedisService {
  private static instance: RedisService | null = null;
  private client: Redis | null = null;
  private memoryStore = new MemoryStore();
  private isConnected = false;
  private hasReportedFallback = false;
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

  private constructor() {
    this.init();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private init(): void {
    if (!config.redisEnabled) {
      console.log('⚡ [Cache] Redis disabled via REDIS_ENABLED=false. Using in-memory fallback cache.');
      return;
    }

    try {
      this.client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: true,
        lazyConnect: false,
        retryStrategy: (times) => {
          if (times > 3) {
            if (!this.hasReportedFallback) {
              console.warn('⚠️ [Cache] Redis host unreachable after 3 attempts. Operating gracefully with in-memory fallback cache.');
              this.hasReportedFallback = true;
            }
            return null; // Stop retrying continuously
          }
          return Math.min(times * 500, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.hasReportedFallback = false;
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.hasReportedFallback = false;
        console.log(`⚡ [Cache] Redis connection ready at ${config.redisUrl}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        if (!this.hasReportedFallback) {
          console.warn(`⚠️ [Cache] Redis connection notice (${err.message}). Using in-memory cache.`);
          this.hasReportedFallback = true;
        }
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (err: any) {
      this.isConnected = false;
      console.warn(`⚠️ [Cache] Failed to instantiate Redis client (${err.message}). Using in-memory cache.`);
    }
  }

  /**
   * Get cached item by key
   */
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.isConnected && this.client) {
        const raw = await this.client.get(key);
        if (raw !== null) {
          this.stats.hits++;
          return JSON.parse(raw);
        }
      } else {
        const mem = this.memoryStore.get(key);
        if (mem !== null) {
          this.stats.hits++;
          return JSON.parse(mem);
        }
      }
    } catch (err) {
      // Fallback on memory or null
      const mem = this.memoryStore.get(key);
      if (mem !== null) {
        this.stats.hits++;
        return JSON.parse(mem);
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set cached item with TTL in seconds
   */
  public async set(key: string, value: any, ttlSeconds: number = config.redisTtlDefault): Promise<boolean> {
    const serialized = JSON.stringify(value);
    this.stats.sets++;

    // Always mirror to memory store for quick local fallback
    this.memoryStore.set(key, serialized, ttlSeconds);

    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds > 0) {
          await this.client.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, serialized);
        }
        return true;
      } catch (err) {
        return false;
      }
    }

    return true;
  }

  /**
   * Delete cached key
   */
  public async del(key: string): Promise<boolean> {
    this.stats.deletes++;
    this.memoryStore.del(key);

    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return true;
      } catch (err) {
        return false;
      }
    }
    return true;
  }

  /**
   * Delete keys matching a wildcard pattern (e.g. 'listings:*', 'stats:*')
   */
  public async delPattern(pattern: string): Promise<number> {
    this.stats.deletes++;
    const memCount = this.memoryStore.delPattern(pattern);

    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
          return keys.length;
        }
      } catch (err) {
        return memCount;
      }
    }

    return memCount;
  }

  /**
   * Flush all cache entries
   */
  public async flush(): Promise<void> {
    this.memoryStore.flush();
    if (this.isConnected && this.client) {
      try {
        await this.client.flushdb();
      } catch (err) {
        // ignore
      }
    }
  }

  /**
   * Status overview for health checks & recruiter transparency
   */
  public async getStatus(): Promise<{
    provider: 'redis' | 'memory-fallback';
    connected: boolean;
    redisUrl: string;
    keysCount: number;
    stats: CacheStats & { hitRatio: string };
  }> {
    let keysCount = this.memoryStore.size();
    if (this.isConnected && this.client) {
      try {
        keysCount = await this.client.dbsize();
      } catch {
        keysCount = this.memoryStore.size();
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? `${((this.stats.hits / totalRequests) * 100).toFixed(1)}%` : '0.0%';

    return {
      provider: this.isConnected ? 'redis' : 'memory-fallback',
      connected: this.isConnected,
      redisUrl: config.redisUrl.replace(/:[^:@]+@/, ':***@'), // hide password if any
      keysCount,
      stats: {
        ...this.stats,
        hitRatio,
      },
    };
  }
}

export const redisService = RedisService.getInstance();
