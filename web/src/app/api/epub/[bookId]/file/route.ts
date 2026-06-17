import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getSession } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { getMinioBucketName, getMinioClient } from "@/lib/minio";
import {
  buildPublicObjectUrl,
  getObjectKeyFromPublicUrl,
  normalizeMinioUrl,
} from "@/lib/minioUtils";

export const runtime = "nodejs";

const FETCH_TIMEOUT_MS = 12000;
const MINIO_CLIENT_TIMEOUT_MS = 4000;

function buildFilename(title: string | null, bookId: number) {
  return (title || `book-${bookId}`)
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchEpubFromUrl(
  sourceUrl: string,
  filename: string,
  sourceLabel: string,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      throw new Error(
        `Fetch failed (${response.status})${response.statusText ? ` ${response.statusText}` : ""}`,
      );
    }

    const headers = new Headers({
      "Content-Type":
        response.headers.get("Content-Type") || "application/epub+zip",
      "Content-Disposition": `inline; filename="${filename || "book"}.epub"`,
      "Cache-Control": "private, max-age=3600",
    });

    const contentLength = response.headers.get("Content-Length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    console.info("[EPUB Route] Streaming EPUB via URL fallback", {
      sourceLabel,
      sourceUrl,
    });

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const session = await getSession();
  const userId = session?.user?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const awaitedParams = await params;
  const bookId = Number.parseInt(awaitedParams.bookId, 10);

  if (!Number.isFinite(bookId)) {
    return NextResponse.json({ error: "Invalid book id" }, { status: 400 });
  }

  const result = await queryWithContext<{
    title: string | null;
    file_format: string | null;
    original_file_url: string | null;
  }>(
    userId,
    `SELECT title, file_format, original_file_url
     FROM books
     WHERE id = $1`,
    [bookId],
  );

  const book = result.rows[0];
  if (!book || book.file_format !== "epub" || !book.original_file_url) {
    return NextResponse.json({ error: "EPUB not found" }, { status: 404 });
  }

  const objectKey = getObjectKeyFromPublicUrl(book.original_file_url);
  const filename = buildFilename(book.title, bookId);

  if (objectKey) {
    try {
      const minioClient = getMinioClient();
      const bucketName = getMinioBucketName();
      const epubStream = (await withTimeout(
        minioClient.getObject(bucketName, objectKey) as Promise<Readable>,
        MINIO_CLIENT_TIMEOUT_MS,
        "MinIO getObject",
      )) as Readable;

      let contentLength: string | null = null;
      try {
        const stat = await withTimeout(
          minioClient.statObject(bucketName, objectKey),
          MINIO_CLIENT_TIMEOUT_MS,
          "MinIO statObject",
        );
        contentLength = String(stat.size);
      } catch (statError) {
        console.warn("[EPUB Route] Failed to stat EPUB via MinIO client", {
          bookId,
          objectKey,
          error: statError,
        });
      }

      return new NextResponse(Readable.toWeb(epubStream) as ReadableStream, {
        status: 200,
        headers: {
          "Content-Type": "application/epub+zip",
          "Content-Disposition": `inline; filename="${filename || `book-${bookId}`}.epub"`,
          "Cache-Control": "private, max-age=3600",
          ...(contentLength ? { "Content-Length": contentLength } : {}),
        },
      });
    } catch (error) {
      console.error("[EPUB Route] Failed to stream EPUB via MinIO client", {
        bookId,
        objectKey,
        error,
      });
    }
  }

  let normalizedUrl: string | null = null;
  try {
    normalizedUrl = normalizeMinioUrl(book.original_file_url);
  } catch (error) {
    console.warn("[EPUB Route] Failed to normalize EPUB URL", {
      bookId,
      error,
    });
  }

  let rebuiltPublicUrl: string | null = null;
  if (objectKey) {
    try {
      rebuiltPublicUrl = buildPublicObjectUrl(objectKey);
    } catch (error) {
      console.warn("[EPUB Route] Failed to rebuild EPUB public URL", {
        bookId,
        objectKey,
        error,
      });
    }
  }

  const fallbackUrls = [
    { url: book.original_file_url, label: "stored-url" },
    ...(normalizedUrl && normalizedUrl !== book.original_file_url
      ? [{ url: normalizedUrl, label: "normalized-url" }]
      : []),
    ...(rebuiltPublicUrl
      ? [{ url: rebuiltPublicUrl, label: "rebuilt-public-url" }]
      : []),
  ].filter((candidate, index, all) => {
    return all.findIndex((item) => item.url === candidate.url) === index;
  });

  for (const candidate of fallbackUrls) {
    try {
      return await fetchEpubFromUrl(candidate.url, filename, candidate.label);
    } catch (error) {
      console.error("[EPUB Route] URL fallback failed", {
        bookId,
        sourceLabel: candidate.label,
        sourceUrl: candidate.url,
        error,
      });
    }
  }

  return NextResponse.json({ error: "Failed to load EPUB" }, { status: 500 });
}
