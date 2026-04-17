import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getSession } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { getMinioBucketName, getMinioClient } from "@/lib/minio";
import { getObjectKeyFromPublicUrl } from "@/lib/minioUtils";

export const runtime = "nodejs";

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
  if (!objectKey) {
    return NextResponse.json(
      { error: "EPUB source is misconfigured" },
      { status: 500 },
    );
  }

  const minioClient = getMinioClient();
  const bucketName = getMinioBucketName();

  try {
    const epubStream = (await minioClient.getObject(
      bucketName,
      objectKey,
    )) as Readable;
    const stat = await minioClient.statObject(bucketName, objectKey);
    const filename = (book.title || `book-${bookId}`)
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return new NextResponse(Readable.toWeb(epubStream) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Disposition": `inline; filename="${filename || `book-${bookId}`}.epub"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[EPUB Route] Failed to stream EPUB", {
      bookId,
      objectKey,
      error,
    });

    return NextResponse.json({ error: "Failed to load EPUB" }, { status: 500 });
  }
}
