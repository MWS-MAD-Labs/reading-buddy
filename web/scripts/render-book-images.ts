import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";
import { getMinioBucketName, getMinioClient } from "@/lib/minio";
import {
  buildBookAssetsPrefix,
  buildPageImageKey,
  getObjectKeyFromPublicUrl,
} from "@/lib/minioUtils";
import {
  writeFileSync,
  unlinkSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  existsSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";

loadEnvConfig(process.cwd());

// Create a dedicated pool for this script
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5434"),
  database: process.env.DB_NAME || "reading_buddy",
  user: process.env.DB_USER || "reading_buddy",
  password: process.env.DB_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const ARG_HELP = `Usage: npm run render:book-images [--bookId=123] [--limit=1]
  --bookId   Process a specific book (creates a job if needed)
  --limit    Maximum number of pending jobs to process (default: 1)
`;

type JobRecord = {
  id: number;
  book_id: number;
  status: string;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result: { bookId?: number; limit: number } = { limit: 1 };
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.info(ARG_HELP);
      process.exit(0);
    }
    if (arg.startsWith("--bookId=")) {
      result.bookId = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--limit=")) {
      result.limit = Number(arg.split("=")[1]);
    }
  }
  return result;
};

const streamToBuffer = async (stream: NodeJS.ReadableStream) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

const ensureJobForBook = async (bookId: number) => {
  const existingResult = await pool.query(
    `SELECT id, status FROM book_render_jobs
     WHERE book_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookId],
  );

  const existing = existingResult.rows[0];

  if (
    existing &&
    existing.status !== "failed" &&
    existing.status !== "completed"
  ) {
    return existing.id;
  }

  const insertResult = await pool.query(
    `INSERT INTO book_render_jobs (book_id, status)
     VALUES ($1, $2)
     RETURNING id`,
    [bookId, "pending"],
  );

  if (insertResult.rows.length === 0) {
    throw new Error("Unable to enqueue job.");
  }

  return insertResult.rows[0].id;
};

const processJob = async (job: JobRecord) => {
  const minio = getMinioClient();
  const bucketName = getMinioBucketName();

  const bookResult = await pool.query(
    `SELECT id, pdf_url, page_images_prefix, page_images_count
     FROM books
     WHERE id = $1`,
    [job.book_id],
  );

  const book = bookResult.rows[0];

  if (!book?.pdf_url) {
    throw new Error("Book record missing or PDF URL unavailable.");
  }

  await pool.query(
    `UPDATE book_render_jobs
     SET status = $1, started_at = $2, processed_pages = 0
     WHERE id = $3`,
    ["processing", new Date().toISOString(), job.id],
  );

  const pdfObjectKey = getObjectKeyFromPublicUrl(book.pdf_url);
  if (!pdfObjectKey) {
    throw new Error("Unable to derive MinIO object key for PDF.");
  }

  // Download PDF to temporary file
  const tempDir = mkdtempSync(join(tmpdir(), "pdf-render-"));
  const tempPdfPath = join(tempDir, "book.pdf");

  const pdfStream = await minio.getObject(bucketName, pdfObjectKey);
  const pdfBuffer = await streamToBuffer(pdfStream);
  writeFileSync(tempPdfPath, pdfBuffer);

  console.log(`Downloaded PDF: ${pdfBuffer.length} bytes`);

  try {
    const pagePrefix = buildBookAssetsPrefix(book.id);

    // Use pdftocairo for reliable PDF rendering
    const outputPrefix = join(tempDir, "page");

    console.log("Converting PDF to images using pdftocairo...");

    // First, get the page count
    const pdfInfoOutput = execSync(`pdfinfo "${tempPdfPath}"`, {
      encoding: "utf-8",
    });
    const pageCountMatch = pdfInfoOutput.match(/Pages:\s+(\d+)/);
    const totalPages = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 0;

    if (!totalPages) {
      throw new Error("Could not determine page count from PDF");
    }

    console.log(`PDF has ${totalPages} pages`);

    // Convert each page individually
    for (let page = 1; page <= totalPages; page++) {
      const pageOutput = join(tempDir, "page");

      // Update progress before converting
      await pool.query(
        `UPDATE book_render_jobs
         SET processed_pages = $1, total_pages = $2
         WHERE id = $3`,
        [page - 1, totalPages, job.id],
      );

      try {
        execSync(
          `pdftocairo -jpeg -r 150 -f ${page} -l ${page} -jpegopt quality=95 "${tempPdfPath}" "${pageOutput}"`,
          { stdio: "pipe" },
        );

        // Rename the generated file
        let generatedFile: string | null = null;

        // Try different padding formats
        for (const padding of [2, 3, 4]) {
          const candidate = join(
            tempDir,
            `page-${String(page).padStart(padding, "0")}.jpg`,
          );
          if (existsSync(candidate)) {
            generatedFile = candidate;
            break;
          }
        }

        if (!generatedFile) {
          throw new Error(
            `Generated file not found for page ${page} (tried 2, 3, and 4-digit padding formats)`,
          );
        }

        const targetFile = join(
          tempDir,
          `page-${String(page).padStart(4, "0")}.jpg`,
        );

        execSync(`mv "${generatedFile}" "${targetFile}"`);
        console.log(`✓ Converted page ${page}/${totalPages}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `✗ Error converting page ${page}/${totalPages}:`,
          errorMsg,
        );
        throw new Error(
          `❌ RENDERING FAILED at page ${page}/${totalPages}: ${errorMsg}`,
        );
      }
    }

    console.log(`✅ All ${totalPages} pages successfully converted`);

    // Get list of generated images
    const generatedFiles = readdirSync(tempDir)
      .filter((file) => file.match(/^page-\d{4}\.jpg$/))
      .sort();

    console.log(
      `Generated ${generatedFiles.length} page images out of ${totalPages} total pages`,
    );
    console.log(`First 5 files:`, generatedFiles.slice(0, 5));

    if (generatedFiles.length === 0) {
      throw new Error(
        "No page images were generated. Check PDF file integrity.",
      );
    }

    // Validate that ALL pages were converted
    if (generatedFiles.length !== totalPages) {
      const missingPages: number[] = [];
      const generatedPageNumbers = new Set(
        generatedFiles.map((file) => {
          const match = file.match(/page-(\d{4})\.jpg/);
          return match ? parseInt(match[1], 10) : 0;
        }),
      );

      for (let page = 1; page <= totalPages; page++) {
        if (!generatedPageNumbers.has(page)) {
          missingPages.push(page);
        }
      }

      const errorMessage = `❌ INCOMPLETE RENDERING: Expected ${totalPages} pages but only generated ${generatedFiles.length} images. Missing pages: ${missingPages.join(", ")}`;

      throw new Error(errorMessage);
    }

    // Upload each page to MinIO
    for (let i = 0; i < generatedFiles.length; i++) {
      const pageNumber = i + 1;
      const localFilePath = join(tempDir, generatedFiles[i]);
      const buffer = readFileSync(localFilePath);

      const objectKey = buildPageImageKey(book.id, pageNumber);

      console.log(
        `Uploading page ${pageNumber}: ${buffer.length} bytes to ${objectKey}`,
      );

      await minio.putObject(bucketName, objectKey, buffer, buffer.length, {
        "Content-Type": "image/jpeg",
      });

      await pool.query(
        `UPDATE book_render_jobs
         SET processed_pages = $1, total_pages = $2
         WHERE id = $3`,
        [pageNumber, totalPages, job.id],
      );

      console.log(`✓ Uploaded page ${pageNumber}`);

      // Clean up local file
      unlinkSync(localFilePath);
    }

    // Update book record - also update page_count for EPUBs/MOBIs
    await pool.query(
      `UPDATE books
       SET page_images_prefix = $1,
           page_images_count = $2,
           page_images_rendered_at = $3,
           page_count = $4
       WHERE id = $5`,
      [pagePrefix, totalPages, new Date().toISOString(), totalPages, book.id],
    );

    await pool.query(
      `UPDATE book_render_jobs
       SET status = $1, finished_at = $2, total_pages = $3
       WHERE id = $4`,
      ["completed", new Date().toISOString(), totalPages, job.id],
    );

    console.info(
      `✅ Successfully rendered all ${totalPages} pages for book ${book.id}`,
    );

    console.log(`DEBUG: Temp directory preserved: ${tempDir}`);
    console.log(`DEBUG: You can inspect the PDF at: ${tempPdfPath}`);
  } finally {
    // Clean up temp files - DISABLED FOR DEBUGGING
    // try {
    //   unlinkSync(tempPdfPath);
    // } catch (e) {
    //   // Ignore cleanup errors
    // }
  }
};

const main = async () => {
  const { bookId, limit } = parseArgs();

  if (bookId) {
    const jobId = await ensureJobForBook(bookId);
    const jobResult = await pool.query(
      `SELECT * FROM book_render_jobs WHERE id = $1`,
      [jobId],
    );

    const job = jobResult.rows[0];
    if (job) {
      await processJob(job as JobRecord);
      return;
    }
    throw new Error("Unable to load job that was just created.");
  }

  const jobsResult = await pool.query(
    `SELECT * FROM book_render_jobs
     WHERE status = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    ["pending", limit],
  );

  const jobs = jobsResult.rows;

  if (!jobs?.length) {
    console.info("No pending jobs found.");
    return;
  }

  for (const job of jobs as JobRecord[]) {
    try {
      await processJob(job);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await pool.query(
        `UPDATE book_render_jobs
         SET status = $1, error_message = $2, finished_at = $3
         WHERE id = $4`,
        ["failed", message, new Date().toISOString(), job.id],
      );
      console.error(`Job ${job.id} failed:`, message);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
