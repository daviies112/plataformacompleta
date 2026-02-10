/**
 * Rate limiting middleware using Redis cache
 * Protects API from abuse and ensures fair usage for 1000+ clients
 */

import { Request, Response, NextFunction } from 'express';
import { cache } from '../lib/cache';

interface RateLimitConfig {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

/**
 * Create custom rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100, // 100 requests per window
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    keyGenerator = (req: Request) => `ratelimit:${req.ip}:${req.path}`,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      // Skip rate limiting in development mode
      if (process.env.NODE_ENV !== 'production') {
        return next();
      }

      // Get current count
      const current = await cache.get<number>(key) || 0;

      // Check if limit exceeded
      if (current >= max) {
        const retryAfter = windowSeconds;
        
        res.setHeader('X-RateLimit-Limit', max.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
        res.setHeader('Retry-After', retryAfter.toString());
        
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter,
        });
      }

      // Increment counter
      const newCount = await cache.incr(key);
      
      // Set expiration on first request
      if (newCount === 1) {
        await cache.expire(key, windowSeconds);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - newCount).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      // Handle successful requests
      if (skipSuccessfulRequests) {
        res.on('finish', async () => {
          if (res.statusCode < 400) {
            await cache.del(key);
          }
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request on error
      next();
    }
  };
}

/**
 * General API rate limiter (100 req/min)
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 100,
  message: 'Muitas requisições da API. Tente novamente em 1 minuto.',
});

/**
 * Strict auth rate limiter (5 req/15min)
 */
export const authLimiter = createRateLimiter({
  windowMs: 900000, // 15 minutes
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  keyGenerator: (req: Request) => `auth:${req.ip}`,
});

/**
 * File upload rate limiter (10 req/min)
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 10,
  message: 'Muitos uploads. Tente novamente em 1 minuto.',
  keyGenerator: (req: Request) => `upload:${req.ip}`,
});

/**
 * Search/Query rate limiter (30 req/min)
 */
export const queryLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 30,
  message: 'Muitas consultas. Tente novamente em 1 minuto.',
  keyGenerator: (req: Request) => `query:${req.ip}`,
});

/**
 * Per-user rate limiter (considers authenticated user)
 */
export function createUserRateLimiter(config: RateLimitConfig = {}) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      const userId = user?.id || user?.clientId || req.ip;
      return `user:${userId}:${req.path}`;
    },
  });
}

/**
 * Slow down middleware (gradual delay instead of blocking)
 */
export function createSlowDown(config: {
  windowMs?: number;
  delayAfter?: number;
  delayMs?: number;
  maxDelayMs?: number;
} = {}) {
  const {
    windowMs = 60000,
    delayAfter = 50,
    delayMs = 500,
    maxDelayMs = 20000,
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `slowdown:${req.ip}:${req.path}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    try {
      const current = await cache.get<number>(key) || 0;
      
      // Increment counter
      const newCount = await cache.incr(key);
      
      // Set expiration on first request
      if (newCount === 1) {
        await cache.expire(key, windowSeconds);
      }

      // Calculate delay if threshold exceeded
      if (newCount > delayAfter) {
        const delayAmount = Math.min((newCount - delayAfter) * delayMs, maxDelayMs);
        
        res.setHeader('X-Slowdown-Delay', delayAmount.toString());
        
        await new Promise(resolve => setTimeout(resolve, delayAmount));
      }

      next();
    } catch (error) {
      console.error('Slow down error:', error);
      next();
    }
  };
}

/**
 * General slow down middleware
 */
export const speedLimiter = createSlowDown({
  windowMs: 60000,
  delayAfter: 50,
  delayMs: 500,
  maxDelayMs: 20000,
});
