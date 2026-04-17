import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const mockDisplay = vi.fn();
const mockOn = vi.fn();
const mockGenerate = vi.fn();
const mockLoad = vi.fn();
const mockCoverUrl = vi.fn();
const mockRenderTo = vi.fn();

vi.mock("epubjs", () => {
  return {
    __esModule: true,
    default: vi.fn(() => ({
      ready: Promise.resolve(),
      loaded: {
        metadata: Promise.resolve({
          title: "Mock Book",
          creator: "Mock Author",
        }),
        navigation: Promise.resolve({
          toc: [],
        }),
      },
      coverUrl: mockCoverUrl,
      locations: {
        generate: mockGenerate,
        load: mockLoad,
        locationFromCfi: vi.fn((cfi: string) => (cfi === "saved-cfi" ? 5 : 0)),
        cfiFromLocation: vi.fn((location: number) => `page-cfi-${location}`),
        percentageFromCfi: vi.fn(() => 0.5),
      },
      renderTo: mockRenderTo,
      destroy: vi.fn(),
    })),
    Book: class Book {},
  };
});

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  });
});

describe("EpubFlipReader resume behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockGenerate.mockResolvedValue(["cfi-0", "cfi-1", "cfi-2"]);
    mockLoad.mockReturnValue(["cfi-0", "cfi-1", "cfi-2"]);
    mockCoverUrl.mockResolvedValue(null);
    mockRenderTo.mockReturnValue({
      display: mockDisplay,
      on: mockOn,
      prev: vi.fn(),
      next: vi.fn(),
      resize: vi.fn(),
      destroy: vi.fn(),
      themes: {
        register: vi.fn(),
        select: vi.fn(),
        override: vi.fn(),
        fontSize: vi.fn(),
        font: vi.fn(),
      },
    });
    localStorage.clear();
  });

  it("prefers saved cfi over numeric page fallback", async () => {
    const { EpubFlipReader } = await import("@/components/dashboard/EpubFlipReader");

    render(
      <EpubFlipReader
        bookId={1}
        epubUrl="/api/epub/1/file"
        initialPage={2}
        initialCfi="saved-cfi"
      />,
    );

    await waitFor(() => {
      expect(mockDisplay).toHaveBeenCalledWith("saved-cfi");
    });
  });

  it("falls back to the numeric page when no saved cfi exists", async () => {
    const { EpubFlipReader } = await import("@/components/dashboard/EpubFlipReader");

    render(
      <EpubFlipReader
        bookId={1}
        epubUrl="/api/epub/1/file"
        initialPage={2}
        initialCfi={null}
      />,
    );

    await waitFor(() => {
      expect(mockDisplay).toHaveBeenCalledWith("page-cfi-1");
    });
  });
});
