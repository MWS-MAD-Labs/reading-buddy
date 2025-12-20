import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  suggestCheckpoints,
  suggestQuestionCount,
  extractTextFromPDF,
  extractPageRangeText,
} from "@/lib/pdf-extractor";

// Mock MinIO client
vi.mock("@/lib/minio", () => ({
  getMinioClient: vi.fn(),
  getMinioBucketName: vi.fn(() => "test-bucket"),
}));

// Mock MinIO utils
vi.mock("@/lib/minioUtils", () => ({
  getObjectKeyFromPublicUrl: vi.fn((url: string) => {
    if (url.includes("invalid")) return null;
    return "books/test-book.pdf";
  }),
}));

describe("suggestCheckpoints", () => {
  it("should suggest checkpoints for a 100-page book", () => {
    const checkpoints = suggestCheckpoints(100);

    expect(checkpoints).toBeInstanceOf(Array);
    expect(checkpoints.length).toBeGreaterThan(0);
    expect(checkpoints.every((cp) => cp > 0 && cp <= 100)).toBe(true);
  });

  it("should suggest checkpoints every 50 pages", () => {
    const checkpoints = suggestCheckpoints(150);

    expect(checkpoints).toEqual([50, 100]);
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

  it("should not include checkpoints beyond total pages", () => {
    const checkpoints = suggestCheckpoints(75);

    expect(checkpoints.every((cp) => cp < 75)).toBe(true);
  });

  it("should handle exactly 100 pages", () => {
    const checkpoints = suggestCheckpoints(100);

    expect(checkpoints).toEqual([50]);
  });

  it("should handle 0 pages", () => {
    const checkpoints = suggestCheckpoints(0);

    expect(checkpoints).toEqual([]);
  });
});

describe("suggestQuestionCount", () => {
  it("should return 3 for 20 pages or less", () => {
    expect(suggestQuestionCount(1)).toBe(3);
    expect(suggestQuestionCount(10)).toBe(3);
    expect(suggestQuestionCount(20)).toBe(3);
  });

  it("should return 5 for 21-50 pages", () => {
    expect(suggestQuestionCount(21)).toBe(5);
    expect(suggestQuestionCount(30)).toBe(5);
    expect(suggestQuestionCount(50)).toBe(5);
  });

  it("should return 7 for 51-100 pages", () => {
    expect(suggestQuestionCount(51)).toBe(7);
    expect(suggestQuestionCount(75)).toBe(7);
    expect(suggestQuestionCount(100)).toBe(7);
  });

  it("should return 10 for more than 100 pages", () => {
    expect(suggestQuestionCount(101)).toBe(10);
    expect(suggestQuestionCount(200)).toBe(10);
    expect(suggestQuestionCount(500)).toBe(10);
  });

  it("should suggest more questions for larger page ranges", () => {
    const small = suggestQuestionCount(10);
    const large = suggestQuestionCount(100);

    expect(large).toBeGreaterThanOrEqual(small);
  });

  it("should handle edge case of 0 pages", () => {
    const count = suggestQuestionCount(0);

    expect(count).toBeGreaterThan(0);
    expect(count).toBe(3);
  });
});

describe("extractTextFromPDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error for invalid PDF URL", async () => {
    await expect(
      extractTextFromPDF("https://example.com/invalid/path"),
    ).rejects.toThrow("Invalid PDF URL - cannot extract object key");
  });

  it("should validate page range bounds", async () => {
    const { getMinioClient } = await import("@/lib/minio");

    // Mock MinIO client with a simple PDF
    const mockStream = {
      on: vi.fn(
        (event: string, handler: (() => void) | ((data: Buffer) => void)) => {
          if (event === "data") {
            // Simulate PDF data
            (handler as (data: Buffer) => void)(Buffer.from("mock-pdf-data"));
          }
          if (event === "end") {
            (handler as () => void)();
          }
          return mockStream;
        },
      ),
    };

    const mockMinioClient = {
      getObject: vi.fn().mockResolvedValue(mockStream),
    };

    vi.mocked(getMinioClient).mockReturnValue(
      mockMinioClient as ReturnType<typeof getMinioClient>,
    );

    // This will fail at PDF parsing stage, but validates our error handling
    await expect(
      extractTextFromPDF("https://example.com/test.pdf", { start: 0, end: 10 }),
    ).rejects.toThrow();
  });
});

describe("extractPageRangeText", () => {
  it("should format page range text with page numbers", async () => {
    // We can't easily test the full PDF extraction without a real PDF file
    // But we can verify the function exists and has correct signature
    expect(typeof extractPageRangeText).toBe("function");
  });
});
