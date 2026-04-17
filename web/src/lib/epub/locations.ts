export const EPUB_LOCATION_BREAK_CHARS = 1024;

type LocationsLike = {
  locationFromCfi: (cfi: string) => unknown;
  cfiFromLocation: (location: number) => unknown;
  percentageFromCfi: (cfi: string) => number | null;
};

export type EpubBookLike = {
  locations: LocationsLike;
};

export type EpubNavItem = {
  id?: string;
  label?: string;
  href?: string;
  subitems?: EpubNavItem[];
};

export type NormalizedTocItem = {
  id: string;
  label: string;
  href: string;
  depth: number;
  children: NormalizedTocItem[];
};

export function getEpubLocationsCacheKey(bookId: number | string) {
  return `epub-locations:${bookId}:v1`;
}

export function parseStoredLocations(
  value: string | null | undefined,
): string[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getCanonicalPageFromCfi(
  book: EpubBookLike,
  cfi: string | null | undefined,
): number | null {
  if (!cfi) {
    return null;
  }

  const locationIndex = toLocationNumber(book.locations.locationFromCfi(cfi));
  if (locationIndex === null || locationIndex < 0) {
    return null;
  }

  return locationIndex + 1;
}

export function getCfiFromCanonicalPage(
  book: EpubBookLike,
  page: number | null | undefined,
): string | null {
  if (!page || !Number.isFinite(page)) {
    return null;
  }

  const targetLocation = Math.max(0, Math.floor(page) - 1);
  const cfi = book.locations.cfiFromLocation(targetLocation);
  return typeof cfi === "string" && cfi.length > 0 ? cfi : null;
}

export function getProgressPercentFromCfi(
  book: EpubBookLike,
  cfi: string | null | undefined,
): number | null {
  if (!cfi) {
    return null;
  }

  const percentage = book.locations.percentageFromCfi(cfi);
  if (typeof percentage !== "number" || Number.isNaN(percentage)) {
    return null;
  }

  return Math.max(0, Math.min(100, percentage * 100));
}

export function normalizeTocItems(
  items: EpubNavItem[],
  depth = 0,
): NormalizedTocItem[] {
  return items
    .filter((item) => item.href && item.label)
    .map((item, index) => ({
      id: item.id || `${depth}-${index}-${item.href}`,
      label: item.label || "Untitled",
      href: item.href || "",
      depth,
      children: normalizeTocItems(item.subitems || [], depth + 1),
    }));
}

export function resolveInitialEpubTarget(args: {
  initialCfi?: string | null;
  initialPage?: number | null;
  book: EpubBookLike;
}) {
  if (args.initialCfi) {
    return args.initialCfi;
  }

  return getCfiFromCanonicalPage(args.book, args.initialPage);
}

function toLocationNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}
