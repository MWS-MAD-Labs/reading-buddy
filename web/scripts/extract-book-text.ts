import { loadEnvConfig } from "@next/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractTextFromPDF } from "@/lib/pdf-extractor";
import type { SupabaseClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const ARG_HELP = `Usage: npm run extract:book-text [--bookId=123] [--limit=1]
  --bookId   Extract text for a specific book
  --limit    Maximum number of books to process (default: 1)
`;

type BookRecord = {
  id: number;
  title: string;
  pdf_url: string;
  page_count: number | null;
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

const processBook = async (book: BookRecord) => {
  const supabase = getSupabaseAdminClient();

  console.log(`\n========================================`);
  console.log(`Processing book: ${book.title} (ID: ${book.id})`);
  console.log(`========================================\n`);

  if (!book.pdf_url) {
    throw new Error("Book has no PDF URL");
  }

  try {
    console.log("Starting PDF text extraction...");
    const startTime = Date.now();

    // Extract all text from the PDF
    const textContent = await extractTextFromPDF(book.pdf_url);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Extraction completed in ${duration}s`);
    console.log(`   Total pages: ${textContent.totalPages}`);
    console.log(`   Total words: ${textContent.totalWords}`);
    console.log(`   Extraction method: ${textContent.extractionMethod}`);

    // Check if we got meaningful text
    if (textContent.totalWords < 100) {
      console.warn(
        `⚠️  WARNING: Only ${textContent.totalWords} words extracted. This might be an image-based PDF.`,
      );
      console.warn(
        "   Consider implementing OCR for better results (future enhancement).",
      );
    }

    // Save to database
    console.log("\nSaving to database...");
    const { error: updateError } = await supabase
      .from("books")
      .update({
        page_text_content: {
          pages: textContent.pages,
          totalPages: textContent.totalPages,
          totalWords: textContent.totalWords,
          extractionMethod: textContent.extractionMethod,
        },
        text_extracted_at: new Date().toISOString(),
        text_extraction_method: textContent.extractionMethod,
      })
      .eq("id", book.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Successfully saved text content for "${book.title}"`);
    console.log(
      `   Preview (first 200 chars): ${textContent.pages[0]?.text.substring(0, 200)}...`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error processing book ${book.id}:`, errorMessage);
    throw error;
  }
};

const main = async () => {
  const { bookId, limit } = parseArgs();
  const supabase = getSupabaseAdminClient();

  if (bookId) {
    // Process specific book
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id, title, pdf_url, page_count")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      throw new Error(`Book ${bookId} not found`);
    }

    await processBook(book as BookRecord);
    return;
  }

  // Process books without text extraction
  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, pdf_url, page_count")
    .is("text_extracted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  if (!books || books.length === 0) {
    console.info("✨ No books need text extraction.");
    return;
  }

  console.log(`\nFound ${books.length} book(s) to process\n`);

  for (const book of books as BookRecord[]) {
    try {
      await processBook(book);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Failed to process book ${book.id}: ${message}\n`);
      // Continue with next book instead of stopping
    }
  }

  console.log(`\n✅ Text extraction completed!`);
};

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exitCode = 1;
});
