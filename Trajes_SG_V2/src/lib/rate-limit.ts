import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting para API routes críticas.
 * - Si UPSTASH_REDIS_REST_URL/TOKEN están configurados → Upstash (producción).
 * - Si no → limitador en memoria (solo desarrollo local).
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ---------- Fallback en memoria (desarrollo) ----------
interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

function memoryRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(identifier);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, reset: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

// ---------- Upstash (producción) ----------
let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(limit: number, windowSeconds: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  upstashLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
    prefix: 'csg-ratelimit',
  });
  return upstashLimiter;
}

/**
 * Verifica el límite de peticiones para un identificador (IP, userId, etc).
 * @param identifier Identificador único (normalmente la IP del cliente)
 * @param limit Máximo de peticiones permitidas en la ventana
 * @param windowSeconds Tamaño de la ventana en segundos (default: 60)
 */
export async function rateLimit(
  identifier: string,
  limit = 10,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(limit, windowSeconds);

  if (limiter) {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  return memoryRateLimit(identifier, limit, windowSeconds * 1000);
}