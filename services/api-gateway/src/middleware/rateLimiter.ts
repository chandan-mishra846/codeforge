import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || 'rce_redis_password';

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redisClient.on('connect', () => console.log('[Redis] Connected successfully.'));
redisClient.on('error', (err) => console.error('[Redis] Connection error:', err));

/**
 * Sliding Window Rate Limiter
 * @param windowSecs Window duration in seconds (default 60s)
 * @param maxRequests Maximum allowed submissions per user in window (default 5)
 */
export function slidingWindowRateLimiter(windowSecs: number = 60, maxRequests: number = 5) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.body?.userId || req.headers['x-user-id'] || req.ip;

    if (!userId) {
      return res.status(400).json({ error: 'User identifier (userId) is required.' });
    }

    const key = `rate-limit:submissions:${userId}`;
    const now = Date.now();
    const windowStart = now - windowSecs * 1000;

    try {
      // Use Redis transaction to record request and prune expired entries
      const multi = redisClient.multi();
      multi.zremrangebyscore(key, 0, windowStart); // Prune old requests outside window
      multi.zadd(key, now, `${now}:${Math.random()}`); // Add current request timestamp
      multi.zcard(key); // Count active requests in current window
      multi.expire(key, windowSecs + 5); // Ensure key TTL cleanup

      const results = await multi.exec();
      const requestCount = (results?.[2]?.[1] as number) || 0;

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount));

      if (requestCount > maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded.',
          message: `Maximum ${maxRequests} code submissions allowed per ${windowSecs} seconds.`,
          retryAfterSeconds: windowSecs,
        });
      }

      next();
    } catch (error) {
      console.error('[RateLimiter] Error evaluating rate limit:', error);
      // Fallback: allow request in case of Redis failure to maintain availability
      next();
    }
  };
}
