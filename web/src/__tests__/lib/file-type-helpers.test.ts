import { describe, it, expect } from "vitest";
import {
  getAcceptedMimeTypes,
  getFormatName,
  getFormatColor,
} from "@/lib/file-type-detector";

describe("getAcceptedMimeTypes", () => {
  it("should return a non-empty string", () => {
    const mimeTypes = getAcceptedMimeTypes();

    expect(mimeTypes).toBeTruthy();
    expect(typeof mimeTypes).toBe("string");
    expect(mimeTypes.length).toBeGreaterThan(0);
  });

  it("should include PDF mime type", () => {
    const mimeTypes = getAcceptedMimeTypes();

    expect(mimeTypes).toContain("pdf");
  });

  it("should include EPUB mime type", () => {
    const mimeTypes = getAcceptedMimeTypes();

    expect(mimeTypes).toContain("epub");
  });

  it("should include MOBI formats", () => {
    const mimeTypes = getAcceptedMimeTypes();

    expect(mimeTypes.toLowerCase()).toMatch(/mobi|azw/);
  });
});

describe("getFormatName", () => {
  it("should return correct name for PDF", () => {
    const name = getFormatName("pdf");

    expect(name).toBeTruthy();
    expect(name.toLowerCase()).toContain("pdf");
  });

  it("should return correct name for EPUB", () => {
    const name = getFormatName("epub");

    expect(name).toBeTruthy();
    expect(name.toLowerCase()).toContain("epub");
  });

  it("should return correct name for MOBI", () => {
    const name = getFormatName("mobi");

    expect(name).toBeTruthy();
    expect(name.toLowerCase()).toContain("mobi");
  });

  it("should return correct name for AZW", () => {
    const name = getFormatName("azw");

    expect(name).toBeTruthy();
  });

  it("should return correct name for AZW3", () => {
    const name = getFormatName("azw3");

    expect(name).toBeTruthy();
  });

  it("should handle unknown format gracefully", () => {
    const name = getFormatName("unknown" as any);

    // Function doesn't have default case, returns undefined for unknown formats
    expect(name).toBeUndefined();
  });
});

describe("getFormatColor", () => {
  it("should return a color for PDF", () => {
    const color = getFormatColor("pdf");

    expect(color).toBeTruthy();
    expect(typeof color).toBe("string");
  });

  it("should return a color for EPUB", () => {
    const color = getFormatColor("epub");

    expect(color).toBeTruthy();
    expect(typeof color).toBe("string");
  });

  it("should return a color for MOBI", () => {
    const color = getFormatColor("mobi");

    expect(color).toBeTruthy();
    expect(typeof color).toBe("string");
  });

  it("should return a color for AZW", () => {
    const color = getFormatColor("azw");

    expect(color).toBeTruthy();
    expect(typeof color).toBe("string");
  });

  it("should return a color for AZW3", () => {
    const color = getFormatColor("azw3");

    expect(color).toBeTruthy();
    expect(typeof color).toBe("string");
  });

  it("should return different colors for different formats", () => {
    const pdfColor = getFormatColor("pdf");
    const epubColor = getFormatColor("epub");

    // Colors should be distinct (at least different strings)
    expect(pdfColor).not.toBe(epubColor);
  });

  it("should handle unknown format gracefully", () => {
    const color = getFormatColor("unknown" as any);

    expect(color).toBeTruthy();
    expect(typeof color).toBe("string");
  });
});
