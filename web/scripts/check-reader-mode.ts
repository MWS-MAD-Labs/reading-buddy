import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env", override: false });

type BookRow = {
  id: number;
  title: string;
  file_format: "pdf" | "epub" | null;
  pdf_url: string | null;
  original_file_url: string | null;
  text_json_url: string | null;
  text_extraction_status: string | null;
  page_text_content: {
    pages?: Array<unknown>;
    totalPages?: number;
  } | null;
  page_images_prefix: string | null;
  page_images_count: number | null;
  is_picture_book: boolean | null;
  page_count: number | null;
};

function inferReaderMode(book: BookRow) {
  const hasRenderedImages = Boolean(
    book.page_images_prefix && (book.page_images_count ?? 0) > 0,
  );
  const hasExtractedText = Boolean(
    book.page_text_content &&
      Array.isArray(book.page_text_content.pages) &&
      book.page_text_content.pages.length > 0,
  );
  const epubUrl =
    book.file_format === "epub" && book.original_file_url
      ? `/api/epub/${book.id}/file`
      : null;

  if (book.file_format === "epub" || epubUrl) {
    return "epub";
  }

  if (book.file_format === "pdf" || book.pdf_url) {
    const prefersImageReader =
      Boolean(book.is_picture_book) ||
      book.text_extraction_status === "image_fallback" ||
      book.text_extraction_status === "pdf_viewer";

    if (prefersImageReader && hasRenderedImages) {
      return "images";
    }

    if (!prefersImageReader && hasExtractedText) {
      return "text";
    }

    if (hasRenderedImages) {
      return "images";
    }

    return "error";
  }

  return "error";
}

async function main() {
  const rawBookId = process.argv[2];
  const bookId = Number.parseInt(rawBookId || "", 10);

  if (!Number.isFinite(bookId)) {
    console.error("Usage: npm run check:reader-mode -- <bookId>");
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await client.connect();

  try {
    const result = await client.query<BookRow>(
      `SELECT
        id, title, file_format, pdf_url, original_file_url, text_json_url,
        text_extraction_status, page_text_content, page_images_prefix,
        page_images_count, is_picture_book, page_count
       FROM books
       WHERE id = $1`,
      [bookId],
    );

    const book = result.rows[0];
    if (!book) {
      console.error(`Book ${bookId} not found.`);
      process.exit(1);
    }

    const extractedPages = Array.isArray(book.page_text_content?.pages)
      ? book.page_text_content.pages.length
      : 0;

    console.log(JSON.stringify(
      {
        id: book.id,
        title: book.title,
        inferredReaderMode: inferReaderMode(book),
        fileFormat: book.file_format,
        textExtractionStatus: book.text_extraction_status,
        hasPdfUrl: Boolean(book.pdf_url),
        hasOriginalFileUrl: Boolean(book.original_file_url),
        hasTextJsonUrl: Boolean(book.text_json_url),
        extractedPages,
        pageImagesCount: book.page_images_count ?? 0,
        hasPageImagesPrefix: Boolean(book.page_images_prefix),
        isPictureBook: Boolean(book.is_picture_book),
        pageCount: book.page_count,
      },
      null,
      2,
    ));
  } finally {
    await client.end();
  }
}

void main();
