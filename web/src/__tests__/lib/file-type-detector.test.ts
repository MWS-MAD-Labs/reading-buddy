import { describe, it, expect } from "vitest";
import { detectFileType } from "@/lib/file-type-detector";

// Helper to create a File object from buffer
function createMockFile(buffer: Buffer, filename: string): File {
  const uint8Array = new Uint8Array(buffer);
  const blob = new Blob([uint8Array]);
  return new File([blob], filename);
}

describe("detectFileType", () => {
  it("should detect PDF files", async () => {
    // PDF magic number: %PDF-1.
    const pdfBuffer = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35,
    ]);
    const file = createMockFile(pdfBuffer, "test.pdf");
    const result = await detectFileType(file);

    expect(result.format).toBe("pdf");
    expect(result.isValid).toBe(true);
  });

  it("should detect EPUB files by extension", async () => {
    // EPUB is a ZIP file with specific structure
    // ZIP magic number: PK (0x50 0x4b)
    const epubBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const file = createMockFile(epubBuffer, "test.epub");
    const result = await detectFileType(file);

    expect(result.format).toBe("epub");
  });

  it("should detect MOBI files", async () => {
    // MOBI signature "BOOKMOBI" at offset 60
    const mobiBuffer = Buffer.alloc(68);
    Buffer.from("BOOKMOBI").copy(mobiBuffer, 60);
    const file = createMockFile(mobiBuffer, "test.mobi");
    const result = await detectFileType(file);

    expect(result.format).toBe("mobi");
    expect(result.isValid).toBe(true);
  });

  it("should fall back to extension for unknown magic numbers", async () => {
    const unknownBuffer = Buffer.from([0xff, 0xff, 0xff, 0xff]);
    const file = createMockFile(unknownBuffer, "test.pdf");
    const result = await detectFileType(file);

    // Should use extension as fallback
    expect(result.format).toBe("pdf");
  });

  it("should handle files with no extension", async () => {
    const buffer = Buffer.from([0xff, 0xff, 0xff, 0xff]);
    const file = createMockFile(buffer, "noextension");
    const result = await detectFileType(file);

    expect(result).toBeDefined();
    // With no extension and unrecognized magic number, it may default to 'pdf' or 'unknown'
    expect(["pdf", "unknown"]).toContain(result.format);
  });

  it("should handle AZW3 files", async () => {
    const mobiBuffer = Buffer.alloc(68);
    Buffer.from("BOOKMOBI").copy(mobiBuffer, 60);
    const file = createMockFile(mobiBuffer, "test.azw3");
    const result = await detectFileType(file);

    expect(result.format).toBe("azw3");
    expect(result.isValid).toBe(true);
  });
});
