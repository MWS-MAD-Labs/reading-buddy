import { describe, expect, it } from "vitest";
import {
  getCanonicalPageFromCfi,
  getCfiFromCanonicalPage,
  getProgressPercentFromCfi,
  normalizeTocItems,
  parseStoredLocations,
  resolveInitialEpubTarget,
} from "@/lib/epub";

const book = {
  locations: {
    locationFromCfi: (cfi: string) => {
      if (cfi === "epubcfi(/6/2)") return 0;
      if (cfi === "epubcfi(/6/4)") return 4;
      return -1;
    },
    cfiFromLocation: (location: number) => {
      if (location === 0) return "epubcfi(/6/2)";
      if (location === 4) return "epubcfi(/6/4)";
      return -1;
    },
    percentageFromCfi: (cfi: string) => {
      if (cfi === "epubcfi(/6/2)") return 0;
      if (cfi === "epubcfi(/6/4)") return 0.5;
      return null;
    },
  },
};

describe("parseStoredLocations", () => {
  it("parses serialized location arrays", () => {
    expect(parseStoredLocations('["a","b"]')).toEqual(["a", "b"]);
  });

  it("returns null for invalid payloads", () => {
    expect(parseStoredLocations('{"a":1}')).toBeNull();
    expect(parseStoredLocations(null)).toBeNull();
  });
});

describe("canonical EPUB location mapping", () => {
  it("maps CFI to 1-based canonical page numbers", () => {
    expect(getCanonicalPageFromCfi(book, "epubcfi(/6/2)")).toBe(1);
    expect(getCanonicalPageFromCfi(book, "epubcfi(/6/4)")).toBe(5);
  });

  it("maps 1-based canonical page numbers back to CFIs", () => {
    expect(getCfiFromCanonicalPage(book, 1)).toBe("epubcfi(/6/2)");
    expect(getCfiFromCanonicalPage(book, 5)).toBe("epubcfi(/6/4)");
  });

  it("returns progress percentages from CFIs", () => {
    expect(getProgressPercentFromCfi(book, "epubcfi(/6/4)")).toBe(50);
  });

  it("prefers initial CFI over numeric page fallback", () => {
    expect(
      resolveInitialEpubTarget({
        initialCfi: "epubcfi(/6/4)",
        initialPage: 1,
        book,
      }),
    ).toBe("epubcfi(/6/4)");

    expect(
      resolveInitialEpubTarget({
        initialCfi: null,
        initialPage: 1,
        book,
      }),
    ).toBe("epubcfi(/6/2)");
  });
});

describe("normalizeTocItems", () => {
  it("normalizes nested toc entries and drops invalid items", () => {
    const normalized = normalizeTocItems([
      {
        id: "chap-1",
        label: "Chapter 1",
        href: "chapter-1.xhtml",
        subitems: [
          {
            label: "Section 1.1",
            href: "chapter-1.xhtml#section-1",
          },
          {
            label: "Broken Item",
          },
        ],
      },
      {
        label: "Untitled",
      },
    ]);

    expect(normalized).toEqual([
      {
        id: "chap-1",
        label: "Chapter 1",
        href: "chapter-1.xhtml",
        depth: 0,
        children: [
          {
            id: "1-0-chapter-1.xhtml#section-1",
            label: "Section 1.1",
            href: "chapter-1.xhtml#section-1",
            depth: 1,
            children: [],
          },
        ],
      },
    ]);
  });
});
