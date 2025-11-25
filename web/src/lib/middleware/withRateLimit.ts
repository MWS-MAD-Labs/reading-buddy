/**
 * Rate Limiting Middleware for API Routes
 *
 * Provides a wrapper function to add rate limiting to Next.js API route handlers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitExceeded, getClientIdentifier, getUserIdentifier, rateLimitConfig } from '@/lib/rate-limit';

type RateLimitType = keyof typeof rateLimitConfig;

type ApiHandler = (request: NextRequest) => Promise<Response> | Response;

interface RateLimitOptions {
  type: RateLimitType;
  getUserId?: (request: NextRequest) => Promise<string | null>;
}

/**
 * Wraps an API route handler with rate limiting
 *
 * @example
 * ```ts
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   { type: 'fileConversion' }
 * );
 * ```
 */
export function withRateLimit(
  handler: ApiHandler,
  options: RateLimitOptions
): ApiHandler {
  return async (request: NextRequest) => {
    try {
      // Get identifier (user ID if available, otherwise IP)
      let identifier: string;

      if (options.getUserId) {
        const userId = await options.getUserId(request);
        identifier = getUserIdentifier(userId, request.headers);
      } else {
        identifier = `ip:${getClientIdentifier(request.headers)}`;
      }

      // Check rate limit
      const result = await rateLimit(identifier, options.type);

      if (!result.success) {
        return rateLimitExceeded(result.reset);
      }

      // Add rate limit headers to response
      const response = await handler(request);

      // Clone response to add headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });

      newResponse.headers.set('X-RateLimit-Limit', result.limit.toString());
      newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      newResponse.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

      return newResponse;
    } catch (error) {
      console.error('Rate limiting error:', error);
      // If rate limiting fails, allow the request through
      return handler(request);
    }
  };
}

/**
 * Simple rate limiter for server actions (not API routes)
 * Returns true if rate limit exceeded
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<{ exceeded: boolean; reset?: number }> {
  try {
    const result = await rateLimit(identifier, type);

    if (!result.success) {
      return { exceeded: true, reset: result.reset };
    }

    return { exceeded: false };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // If rate limiting fails, allow the request
    return { exceeded: false };
  }
}
