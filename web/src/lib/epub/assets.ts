type AssetBook = {
  archive?: {
    createUrl: (path: string, options: { base64: boolean }) => Promise<string>;
  };
};

type SectionLike = {
  url?: string;
  document?: Document;
};

const XLINK_NS = "http://www.w3.org/1999/xlink";

export async function rewriteArchivedSectionAssetUrls(
  book: AssetBook,
  section: SectionLike,
) {
  if (!book.archive || !section.document || !section.url) {
    return;
  }

  const tasks: Promise<void>[] = [];

  section.document.querySelectorAll("img[src], source[src]").forEach((element) => {
    tasks.push(
      rewriteAttributeUrl(book, section.url ?? "", element, "src").catch((error) => {
        console.warn("Failed to rewrite EPUB asset URL", error);
      }),
    );
  });

  section.document.querySelectorAll("image, use").forEach((element) => {
      tasks.push(
        rewriteNamespacedUrl(book, section.url ?? "", element).catch((error) => {
          console.warn("Failed to rewrite EPUB SVG asset URL", error);
        }),
      );
    });

  await Promise.all(tasks);
}

async function rewriteAttributeUrl(
  book: AssetBook,
  sectionUrl: string,
  element: Element,
  attributeName: string,
) {
  const rawValue = element.getAttribute(attributeName);
  if (!rawValue || shouldSkipAssetUrl(rawValue)) {
    return;
  }

  const blobUrl = await book.archive?.createUrl(
    resolveSectionAssetUrl(sectionUrl, rawValue),
    { base64: false },
  );
  if (blobUrl) {
    element.setAttribute(attributeName, blobUrl);
  }
}

async function rewriteNamespacedUrl(
  book: AssetBook,
  sectionUrl: string,
  element: Element,
) {
  const rawValue =
    element.getAttribute("href") ?? element.getAttributeNS(XLINK_NS, "href");

  if (!rawValue || shouldSkipAssetUrl(rawValue)) {
    return;
  }

  const blobUrl = await book.archive?.createUrl(
    resolveSectionAssetUrl(sectionUrl, rawValue),
    { base64: false },
  );
  if (!blobUrl) {
    return;
  }

  if (element.hasAttribute("href")) {
    element.setAttribute("href", blobUrl);
  }

  if (element.getAttributeNS(XLINK_NS, "href")) {
    element.setAttributeNS(XLINK_NS, "xlink:href", blobUrl);
  }
}

function resolveSectionAssetUrl(sectionUrl: string, assetUrl: string) {
  const resolved = new URL(assetUrl, `http://epub.local${sectionUrl}`);
  return `${resolved.pathname}${resolved.search}`;
}

function shouldSkipAssetUrl(value: string) {
  return (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("#") ||
    /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)
  );
}
