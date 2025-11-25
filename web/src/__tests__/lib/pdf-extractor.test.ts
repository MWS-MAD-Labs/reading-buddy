import { describe, it, expect } from "vitest";
import { suggestCheckpoints, suggestQuestionCount } from "@/lib/pdf-extractor";

describe("suggestCheckpoints", () => {
  it("should suggest checkpoints for a 100-page book", () => {
    const checkpoints = suggestCheckpoints(100);

    expect(checkpoints).toBeInstanceOf(Array);
    expect(checkpoints.length).toBeGreaterThan(0);
    expect(checkpoints.every((cp) => cp > 0 && cp <= 100)).toBe(true);
  });

  it("should suggest checkpoints for a 50-page book", () => {
    const checkpoints = suggestCheckpoints(50);

    expect(checkpoints).toBeInstanceOf(Array);
    // 50 pages means no checkpoints (loop starts at 50, condition is page < totalPages)
    expect(checkpoints.length).toBe(0);
  });

  it("should suggest checkpoints for a 200-page book", () => {
    const checkpoints = suggestCheckpoints(200);

    expect(checkpoints).toBeInstanceOf(Array);
    expect(checkpoints.length).toBeGreaterThan(0);
    expect(checkpoints.every((cp) => cp > 0 && cp <= 200)).toBe(true);
  });

  it("should handle small books (10 pages)", () => {
    const checkpoints = suggestCheckpoints(10);

    expect(checkpoints).toBeInstanceOf(Array);
    // Should have fewer checkpoints for small books
    expect(checkpoints.length).toBeLessThanOrEqual(3);
  });

  it("should handle very large books (500 pages)", () => {
    const checkpoints = suggestCheckpoints(500);

    expect(checkpoints).toBeInstanceOf(Array);
    expect(checkpoints.every((cp) => cp > 0 && cp <= 500)).toBe(true);
    // Should have reasonable number of checkpoints even for large books
    expect(checkpoints.length).toBeLessThan(20);
  });

  it("should return checkpoints in ascending order", () => {
    const checkpoints = suggestCheckpoints(100);

    for (let i = 1; i < checkpoints.length; i++) {
      expect(checkpoints[i]).toBeGreaterThan(checkpoints[i - 1]);
    }
  });
});

describe("suggestQuestionCount", () => {
  it("should suggest appropriate question count for 10-page range", () => {
    const count = suggestQuestionCount(10);

    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(10);
  });

  it("should suggest appropriate question count for 50-page range", () => {
    const count = suggestQuestionCount(50);

    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(20); // Reasonable upper limit
  });

  it("should suggest appropriate question count for 100-page range", () => {
    const count = suggestQuestionCount(100);

    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(25);
  });

  it("should suggest more questions for larger page ranges", () => {
    const small = suggestQuestionCount(10);
    const large = suggestQuestionCount(100);

    expect(large).toBeGreaterThanOrEqual(small);
  });

  it("should handle edge case of 1 page", () => {
    const count = suggestQuestionCount(1);

    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);
  });
});
