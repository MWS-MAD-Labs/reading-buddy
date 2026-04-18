import { describe, it, expect } from "vitest";
import {
  buildPublicPrefixUrl,
  buildPublicObjectUrl,
  getObjectKeyFromPublicUrl,
  buildBookAssetsPrefix,
  buildPageImageKey,
} from "@/lib/minioUtils";

describe("buildPublicObjectUrl", () => {
  it("should build correct URL for given object key", () => {
    const objectKey = "books/123/cover.jpg";
    const url = buildPublicObjectUrl(objectKey);

    expect(url).toBeTruthy();
    expect(url).toContain(objectKey);
    expect(url).toContain("test-bucket");
  });

  it("should handle keys with special characters", () => {
    const objectKey = "books/my book/page-1.jpg";
    const url = buildPublicObjectUrl(objectKey);

    expect(url).toBeTruthy();
    expect(url).toContain("books");
  });
});

describe("buildPublicPrefixUrl", () => {
  it("should build correct URL for given prefix", () => {
    const prefix = "books/123/pages";
    const url = buildPublicPrefixUrl(prefix);

    expect(url).toBeTruthy();
    expect(url).toContain(prefix);
  });

  it("should handle prefixes with trailing slashes", () => {
    const prefix = "books/123/pages/";
    const url = buildPublicPrefixUrl(prefix);

    expect(url).toBeTruthy();
    expect(url).toContain("books/123/pages");
    expect(url).not.toMatch(/\/$/); // Trailing slash should be removed
  });

  it("should handle empty prefix", () => {
    const prefix = "";
    const url = buildPublicPrefixUrl(prefix);

    expect(url).toBeTruthy();
  });
});

describe("getObjectKeyFromPublicUrl", () => {
  it("should extract object key from URL", () => {
    const url = "http://localhost:9000/test-bucket/books/123/cover.jpg";
    const key = getObjectKeyFromPublicUrl(url);

    expect(key).toBe("books/123/cover.jpg");
  });

  it("should handle null URLs", () => {
    const key = getObjectKeyFromPublicUrl(null);
    expect(key).toBeNull();
  });

  it("should handle undefined URLs", () => {
    const key = getObjectKeyFromPublicUrl(undefined);
    expect(key).toBeNull();
  });

  it("should handle empty URLs", () => {
    const key = getObjectKeyFromPublicUrl("");
    expect(key).toBeNull();
  });

  it("should extract object key from internal URLs when public and internal endpoints differ", () => {
    const previousInternalEndpoint = process.env.MINIO_INTERNAL_ENDPOINT;
    const previousInternalPort = process.env.MINIO_INTERNAL_PORT;
    const previousInternalSsl = process.env.MINIO_INTERNAL_USE_SSL;

    process.env.MINIO_INTERNAL_ENDPOINT = "172.16.1.194";
    process.env.MINIO_INTERNAL_PORT = "9000";
    process.env.MINIO_INTERNAL_USE_SSL = "false";

    const key = getObjectKeyFromPublicUrl(
      "http://172.16.1.194:9000/test-bucket/books/internal.epub",
    );

    process.env.MINIO_INTERNAL_ENDPOINT = previousInternalEndpoint;
    process.env.MINIO_INTERNAL_PORT = previousInternalPort;
    process.env.MINIO_INTERNAL_USE_SSL = previousInternalSsl;

    expect(key).toBe("books/internal.epub");
  });
});

describe("buildBookAssetsPrefix", () => {
  it("should build correct prefix for book ID", () => {
    const bookId = 123;
    const prefix = buildBookAssetsPrefix(bookId);

    expect(prefix).toBe("book-pages/123");
  });

  it("should handle large book IDs", () => {
    const bookId = 999999;
    const prefix = buildBookAssetsPrefix(bookId);

    expect(prefix).toBe("book-pages/999999");
  });
});

describe("buildPageImageKey", () => {
  it("should build correct key for page image", () => {
    const bookId = 123;
    const pageNumber = 1;
    const key = buildPageImageKey(bookId, pageNumber);

    expect(key).toBe("book-pages/123/page-0001.jpg");
  });

  it("should pad page numbers correctly", () => {
    const bookId = 123;
    const pageNumber = 99;
    const key = buildPageImageKey(bookId, pageNumber);

    expect(key).toBe("book-pages/123/page-0099.jpg");
  });

  it("should handle large page numbers", () => {
    const bookId = 123;
    const pageNumber = 1234;
    const key = buildPageImageKey(bookId, pageNumber);

    expect(key).toBe("book-pages/123/page-1234.jpg");
  });
});
