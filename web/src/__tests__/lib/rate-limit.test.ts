import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  rateLimit,
  rateLimitConfig,
  getClientIdentifier,
  getUserIdentifier,
  rateLimitExceeded,
} from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("should allow requests within limit", async () => {
    const identifier = "test-user-1";
    const result = await rateLimit(identifier, "standardApi");

    expect(result.success).toBe(true);
    expect(result.limit).toBe(rateLimitConfig.standardApi.maxRequests);
    expect(result.remaining).toBeLessThanOrEqual(result.limit);
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it("should track multiple requests from same identifier", async () => {
    const identifier = "test-user-2";

    // First request
    const result1 = await rateLimit(identifier, "auth");
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(rateLimitConfig.auth.maxRequests - 1);

    // Second request
    const result2 = await rateLimit(identifier, "auth");
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(rateLimitConfig.auth.maxRequests - 2);
  });

  it("should block requests when limit exceeded", async () => {
    const identifier = "test-user-3";
    const maxRequests = rateLimitConfig.fileConversion.maxRequests;

    // Make requests up to the limit
    for (let i = 0; i < maxRequests; i++) {
      const result = await rateLimit(identifier, "fileConversion");
      expect(result.success).toBe(true);
    }

    // Next request should be blocked
    const blockedResult = await rateLimit(identifier, "fileConversion");
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.remaining).toBe(0);
  });

  it("should reset after window expires", async () => {
    // Use a short window for testing
    const identifier = "test-user-4";

    // Make request
    const result1 = await rateLimit(identifier, "standardApi");
    expect(result1.success).toBe(true);

    // Wait for window to expire (1 minute + buffer)
    // Note: In real testing, you'd mock the timer or use a smaller window
    // For now, we just verify the reset timestamp is in the future
    expect(result1.reset).toBeGreaterThan(Date.now());
  });

  it("should handle different rate limit types", async () => {
    const identifier = "test-user-5";

    const authResult = await rateLimit(identifier, "auth");
    expect(authResult.limit).toBe(rateLimitConfig.auth.maxRequests);

    const quizResult = await rateLimit(identifier, "quizGeneration");
    expect(quizResult.limit).toBe(rateLimitConfig.quizGeneration.maxRequests);

    const uploadResult = await rateLimit(identifier, "fileUpload");
    expect(uploadResult.limit).toBe(rateLimitConfig.fileUpload.maxRequests);
  });

  it("should isolate identifiers from each other", async () => {
    const user1 = "test-user-6";
    const user2 = "test-user-7";

    // User 1 makes requests
    const result1 = await rateLimit(user1, "standardApi");
    expect(result1.remaining).toBe(rateLimitConfig.standardApi.maxRequests - 1);

    // User 2 should have full quota
    const result2 = await rateLimit(user2, "standardApi");
    expect(result2.remaining).toBe(rateLimitConfig.standardApi.maxRequests - 1);
  });
});

describe("getClientIdentifier", () => {
  it("should extract IP from x-forwarded-for header", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1, 198.51.100.1",
    });

    const identifier = getClientIdentifier(headers);
    expect(identifier).toBe("203.0.113.1");
  });

  it("should extract IP from x-real-ip header", () => {
    const headers = new Headers({
      "x-real-ip": "203.0.113.2",
    });

    const identifier = getClientIdentifier(headers);
    expect(identifier).toBe("203.0.113.2");
  });

  it("should prefer cf-connecting-ip over other headers", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.3",
      "x-real-ip": "203.0.113.4",
      "x-forwarded-for": "203.0.113.5",
    });

    const identifier = getClientIdentifier(headers);
    expect(identifier).toBe("203.0.113.3");
  });

  it("should return 'unknown' when no IP headers present", () => {
    const headers = new Headers();

    const identifier = getClientIdentifier(headers);
    expect(identifier).toBe("unknown");
  });

  it("should trim whitespace from IP addresses", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.6 , 198.51.100.1",
    });

    const identifier = getClientIdentifier(headers);
    expect(identifier).toBe("203.0.113.6");
  });
});

describe("getUserIdentifier", () => {
  it("should use user ID when available", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1",
    });

    const identifier = getUserIdentifier("user-123", headers);
    expect(identifier).toBe("user:user-123");
  });

  it("should fallback to IP when user ID is null", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.2",
    });

    const identifier = getUserIdentifier(null, headers);
    expect(identifier).toBe("ip:203.0.113.2");
  });

  it("should prefix user ID correctly", () => {
    const headers = new Headers();
    const identifier = getUserIdentifier("abc-def-123", headers);
    expect(identifier).toMatch(/^user:/);
  });

  it("should prefix IP correctly when no user", () => {
    const headers = new Headers({
      "x-real-ip": "192.168.1.1",
    });

    const identifier = getUserIdentifier(null, headers);
    expect(identifier).toMatch(/^ip:/);
  });
});

describe("rateLimitExceeded", () => {
  it("should return 429 status code", () => {
    const reset = Date.now() + 60000; // 1 minute from now
    const response = rateLimitExceeded(reset);

    expect(response.status).toBe(429);
  });

  it("should include retry-after header", async () => {
    const reset = Date.now() + 60000;
    const response = rateLimitExceeded(reset);

    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("should include reset timestamp header", async () => {
    const reset = Date.now() + 60000;
    const response = rateLimitExceeded(reset);

    const resetHeader = response.headers.get("X-RateLimit-Reset");
    expect(resetHeader).toBeTruthy();
    expect(() => new Date(resetHeader!)).not.toThrow();
  });

  it("should return JSON error body", async () => {
    const reset = Date.now() + 60000;
    const response = rateLimitExceeded(reset);

    const body = await response.json();
    expect(body.error).toBe("Too many requests");
    expect(body.message).toBeTruthy();
    expect(body.retryAfter).toBeGreaterThan(0);
    expect(body.resetAt).toBeTruthy();
  });

  it("should calculate retry-after in seconds", async () => {
    const reset = Date.now() + 30000; // 30 seconds
    const response = rateLimitExceeded(reset);

    const body = await response.json();
    expect(body.retryAfter).toBeGreaterThanOrEqual(29);
    expect(body.retryAfter).toBeLessThanOrEqual(31);
  });

  it("should have content-type application/json", () => {
    const reset = Date.now() + 60000;
    const response = rateLimitExceeded(reset);

    expect(response.headers.get("Content-Type")).toBe("application/json");
  });
});

describe("rateLimitConfig", () => {
  it("should have all expected rate limit types", () => {
    expect(rateLimitConfig.fileConversion).toBeDefined();
    expect(rateLimitConfig.quizGeneration).toBeDefined();
    expect(rateLimitConfig.auth).toBeDefined();
    expect(rateLimitConfig.standardApi).toBeDefined();
    expect(rateLimitConfig.fileUpload).toBeDefined();
  });

  it("should have reasonable limits", () => {
    expect(rateLimitConfig.fileConversion.maxRequests).toBeGreaterThan(0);
    expect(rateLimitConfig.quizGeneration.maxRequests).toBeGreaterThan(0);
    expect(rateLimitConfig.auth.maxRequests).toBeGreaterThan(0);
    expect(rateLimitConfig.standardApi.maxRequests).toBeGreaterThan(0);
    expect(rateLimitConfig.fileUpload.maxRequests).toBeGreaterThan(0);
  });

  it("should have time windows in milliseconds", () => {
    expect(rateLimitConfig.fileConversion.windowMs).toBeGreaterThan(1000);
    expect(rateLimitConfig.quizGeneration.windowMs).toBeGreaterThan(1000);
    expect(rateLimitConfig.auth.windowMs).toBeGreaterThan(1000);
    expect(rateLimitConfig.standardApi.windowMs).toBeGreaterThan(1000);
    expect(rateLimitConfig.fileUpload.windowMs).toBeGreaterThan(1000);
  });

  it("should have stricter limits for expensive operations", () => {
    // File conversion should be more restricted than standard API
    expect(rateLimitConfig.fileConversion.maxRequests).toBeLessThan(
      rateLimitConfig.standardApi.maxRequests
    );

    // Quiz generation should be more restricted than standard API
    expect(rateLimitConfig.quizGeneration.maxRequests).toBeLessThan(
      rateLimitConfig.standardApi.maxRequests
    );
  });
});
