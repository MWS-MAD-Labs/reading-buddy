/**
 * Rate Limiting Utilities
 *
 * Provides rate limiting for API endpoints and expensive operations.
 * Uses in-memory storage for development and can be upgraded to Redis for production.
 */

import { Ratelimit } from "@upstash/ratelimit";

// In-memory rate limiter for development
class MemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();

  async limit(identifier: string, maxRequests: number, windowMs: number): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this identifier
    const existing = this.requests.get(identifier) || [];

    // Filter out requests outside the window
    const recentRequests = existing.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const resetTime = oldestRequest + windowMs;

      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup(windowStart);
    }

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - recentRequests.length,
      reset: now + windowMs,
    };
  }

  private cleanup(before: number) {
    for (const [key, timestamps] of this.requests.entries()) {
      const recent = timestamps.filter(t => t > before);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    }
  }
}

// Global in-memory rate limiter instance
const memoryLimiter = new MemoryRateLimiter();

// Rate limit configurations
export const rateLimitConfig = {
  fileConversion: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  quizGeneration: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  auth: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  standardApi: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  fileUpload: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;

/**
 * Get rate limiter for a specific endpoint type
 */
export async function rateLimit(
  identifier: string,
  type: keyof typeof rateLimitConfig
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const config = rateLimitConfig[type];

  // Use in-memory limiter (can be replaced with Upstash Redis for production)
  return memoryLimiter.limit(identifier, config.maxRequests, config.windowMs);
}

/**
 * Get client identifier from request headers
 */
export function getClientIdentifier(headers: Headers): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfConnectingIp = headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';

  return ip.trim();
}

/**
 * Get user identifier from user ID or fallback to IP
 */
export function getUserIdentifier(userId: string | null, headers: Headers): string {
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${getClientIdentifier(headers)}`;
}

/**
 * Format rate limit error response
 */
export function rateLimitExceeded(reset: number) {
  const resetDate = new Date(reset);
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
      resetAt: resetDate.toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': resetDate.toISOString(),
      },
    }
  );
}
