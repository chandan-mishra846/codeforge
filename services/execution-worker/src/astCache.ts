import Redis from 'ioredis';
import * as crypto from 'crypto';
import * as acorn from 'acorn';
import { SupportedLanguage, ExecutionResultPayload } from '@rce/shared';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || 'rce_redis_password';

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

redisClient.on('error', (err) => {
  console.warn('[AST Cache Redis] Connection notice:', err.message);
});

/**
 * Generate AST Hash for code deduplication.
 * For JavaScript: uses acorn AST parser to normalize syntax trees.
 * For Python/C++/Java: strips comments, string literals, and whitespace to form a structural AST fingerprint + SHA-256.
 */
export function generateASTHash(language: SupportedLanguage, code: string): string {
  let normalizedTree = '';

  if (language === 'javascript') {
    try {
      const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
      // Strip location markers and comments for AST structural equality
      normalizedTree = JSON.stringify(ast, (key, value) => {
        if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') return undefined;
        return value;
      });
    } catch {
      // Fallback normalization if parse fails
      normalizedTree = code.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');
    }
  } else {
    // Normalization for Python, C++, Java
    normalizedTree = code
      .replace(/\/\/.*|\/\*[\s\S]*?\*\/|#.*/g, '') // remove single & multi line comments
      .replace(/(["'])(?:(?=(\\?))\2[\s\S])*?\1/g, 'STR') // normalize string literals
      .replace(/\s+/g, ''); // normalize whitespace
  }

  return crypto.createHash('sha256').update(`${language}:${normalizedTree}`).digest('hex');
}

/**
 * Check if identical AST result is cached in Redis for this problem.
 */
export async function getCachedASTResult(
  problemId: string,
  language: SupportedLanguage,
  astHash: string
): Promise<ExecutionResultPayload | null> {
  try {
    const key = `astcache:${problemId}:${language}:${astHash}`;
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    console.warn('[AST Cache] Redis read failed:', err);
    return null;
  }
}

/**
 * Cache AST execution result in Redis with 1-hour TTL (3600 seconds).
 */
export async function cacheASTResult(
  problemId: string,
  language: SupportedLanguage,
  astHash: string,
  result: ExecutionResultPayload
): Promise<void> {
  try {
    const key = `astcache:${problemId}:${language}:${astHash}`;
    await redisClient.setex(key, 3600, JSON.stringify({ ...result, astCacheHit: true }));
  } catch (err) {
    console.warn('[AST Cache] Redis write failed:', err);
  }
}
