import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { getMinioClient, getMinioBucketName } from "@/lib/minio";
import { getObjectKeyFromPublicUrl } from "@/lib/minioUtils";
import path from "path";

// Configure PDF.js worker for Next.js server-side environment
if (typeof window === "undefined") {
  // Server-side: Use absolute path to worker file in node_modules
  const workerPath = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.min.mjs",
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
}

export interface PageText {
  pageNumber: number;
  text: string;
  wordCount: number;
}

export interface BookTextContent {
  pages: PageText[];
  totalPages: number;
  totalWords: number;
  extractionMethod: "pdf-text" | "ocr" | "hybrid";
}

/**
 * Extract text from PDF stored in MinIO
 * @param pdfUrl - Public URL of the PDF in MinIO
 * @param pageRange - Optional range {start, end} to extract specific pages
 */
export async function extractTextFromPDF(
  pdfUrl: string,
  pageRange?: { start: number; end: number },
): Promise<BookTextContent> {
  try {
    // 1. Download PDF from MinIO
    const minioClient = getMinioClient();
    const bucketName = getMinioBucketName();
    const objectKey = getObjectKeyFromPublicUrl(pdfUrl);

    if (!objectKey) {
      throw new Error("Invalid PDF URL - cannot extract object key");
    }

    // Get PDF as buffer
    const chunks: Buffer[] = [];
    const stream = await minioClient.getObject(bucketName, objectKey);

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });

    const pdfBuffer = Buffer.concat(chunks);

    // 2. Load with pdfjs-dist
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      useWorkerFetch: false,
      isEvalSupported: false,
    });

    const pdfDocument = await loadingTask.promise;
    const totalPages = pdfDocument.numPages;

    // Determine page range
    const startPage = pageRange?.start ?? 1;
    const endPage = pageRange?.end ?? totalPages;

    // Validate page range
    if (startPage < 1 || endPage > totalPages || startPage > endPage) {
      throw new Error(
        `Invalid page range: ${startPage}-${endPage} (total pages: ${totalPages})`,
      );
    }

    // 3. Extract text page by page
    const pages: PageText[] = [];
    let totalWords = 0;
    let hasText = false;

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Concatenate text items
      const pageText = textContent.items
        .map((item) => ("str" in item ? (item as { str: string }).str : ""))
        .join(" ")
        .trim();

      const wordCount = pageText ? pageText.split(/\s+/).length : 0;
      totalWords += wordCount;

      if (pageText.length > 0) {
        hasText = true;
      }

      pages.push({
        pageNumber: pageNum,
        text: pageText,
        wordCount,
      });
    }

    // 4. Determine extraction method
    const extractionMethod: "pdf-text" | "ocr" | "hybrid" = hasText
      ? "pdf-text"
      : "ocr";

    return {
      pages,
      totalPages: pages.length,
      totalWords,
      extractionMethod,
    };
  } catch (error) {
    console.error("PDF text extraction error:", error);
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

/**
 * Extract text from specific page range
 */
export async function extractPageRangeText(
  pdfUrl: string,
  startPage: number,
  endPage: number,
): Promise<string> {
  const result = await extractTextFromPDF(pdfUrl, {
    start: startPage,
    end: endPage,
  });

  return result.pages
    .map((page) => `[Page ${page.pageNumber}]\n${page.text}`)
    .join("\n\n");
}

/**
 * Estimate reading checkpoints based on book length
 * @param totalPages - Total pages in book
 * @returns Array of suggested checkpoint page numbers
 */
export function suggestCheckpoints(totalPages: number): number[] {
  // Auto-generate checkpoints every ~50 pages
  const interval = 50;
  const checkpoints: number[] = [];

  for (let page = interval; page < totalPages; page += interval) {
    checkpoints.push(page);
  }

  return checkpoints;
}

/**
 * Suggest question count based on page range
 */
export function suggestQuestionCount(pageRange: number): number {
  if (pageRange <= 20) return 3;
  if (pageRange <= 50) return 5;
  if (pageRange <= 100) return 7;
  return 10;
}
