import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { loadEnv } from '../../config/env.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;
  private readonly fallbackLimits = new Map<string, { count: number; resetAt: number }>();

  onModuleInit() {
    const env = loadEnv();
    if (!env.redisUrl) {
      this.logger.warn('REDIS_URL not configured — running with in-memory rate-limit fallback.');
      return;
    }

    this.client = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      tls: env.redisUrl.startsWith('rediss://') ? {} : undefined,
      retryStrategy: () => null, // Fail fast so outages degrade gracefully
    });

    this.client.on('ready', () => {
      this.available = true;
    });
    this.client.on('error', (err) => {
      if (this.available) {
        this.logger.warn(`Redis unavailable (${err.message}) — degrading gracefully.`);
      }
      this.available = false;
    });

    this.client.connect().catch(() => {
      this.available = false;
      this.logger.warn('Redis connection not available — continuing with PostgreSQL fallback.');
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }

  isAvailable(): boolean {
    return this.available && this.client !== null;
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.isAvailable() || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Graceful degradation
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Graceful degradation
    }
  }

  async invalidateUserAuthCache(userId: string): Promise<void> {
    await this.del(`sf:auth:profile:${userId}`);
  }

  /**
   * Sliding window rate-limiter with bounded in-memory fallback.
   * Redis outage never bypasses rate-limit protections.
   */
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (this.isAvailable() && this.client) {
      try {
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.expire(key, windowSeconds);
        }
        return count <= limit;
      } catch {
        // Fall through to in-memory limiter
      }
    }

    const now = Date.now();
    const existing = this.fallbackLimits.get(key);
    if (!existing || existing.resetAt <= now) {
      if (this.fallbackLimits.size > 5000) {
        this.fallbackLimits.clear();
      }
      this.fallbackLimits.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }
    existing.count += 1;
    return existing.count <= limit;
  }
}
