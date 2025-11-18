import { loadEnvConfig } from "@next/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

loadEnvConfig(process.cwd());

const ARG_HELP = `Usage: npm run check:extracted-text [--bookId=123] [--page=1]
  --bookId   Book ID to check
  --page     Specific page number to view (optional)
`;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result: { bookId?: number; page?: number } = {};

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.info(ARG_HELP);
      process.exit(0);
    }
    if (arg.startsWith("--bookId=")) {
      result.bookId = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--page=")) {
      result.page = Number(arg.split("=")[1]);
    }
  }

  return result;
};

const checkExtractedText = async () => {
  const { bookId, page } = parseArgs();
  const supabase = getSupabaseAdminClient();

  if (!bookId) {
    console.error("Error: --bookId is required");
    console.log(ARG_HELP);
    process.exit(1);
  }

  console.log("========================================");
  console.log(`Checking Extracted Text for Book ID: ${bookId}`);
  console.log("========================================\n");

  const { data: book, error } = await supabase
    .from("books")
    .select("id, title, author, page_count, page_text_content, text_extracted_at, text_extraction_method")
    .eq("id", bookId)
    .single();

  if (error || !book) {
    console.error(`Book ${bookId} not found`);
    process.exit(1);
  }

  console.log(`Book: ${book.title}`);
  console.log(`Author: ${book.author}`);
  console.log(`Pages: ${book.page_count}\n`);

  if (!book.text_extracted_at) {
    console.log("❌ Text has not been extracted for this book yet.");
    console.log(`Run: npm run extract:book-text -- --bookId=${bookId}`);
    process.exit(0);
  }

  console.log(`✅ Text extracted at: ${new Date(book.text_extracted_at).toLocaleString()}`);
  console.log(`   Extraction method: ${book.text_extraction_method}\n`);

  const textContent = book.page_text_content as {
    pages: { pageNumber: number; text: string; wordCount: number }[];
    totalPages: number;
    totalWords: number;
    extractionMethod: string;
  };

  if (!textContent) {
    console.log("❌ No text content found in database");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Extraction Summary");
  console.log("========================================");
  console.log(`Total Pages: ${textContent.totalPages}`);
  console.log(`Total Words: ${textContent.totalWords}`);
  console.log(`Average Words/Page: ${Math.round(textContent.totalWords / textContent.totalPages)}`);
  console.log(`Extraction Method: ${textContent.extractionMethod}\n`);

  // Quality assessment
  const pagesWithText = textContent.pages.filter((p) => p.wordCount > 0).length;
  const pagesWithoutText = textContent.totalPages - pagesWithText;
  const avgWordsPerPage = textContent.totalWords / textContent.totalPages;

  console.log("========================================");
  console.log("Quality Assessment");
  console.log("========================================");
  console.log(`Pages with text: ${pagesWithText}/${textContent.totalPages}`);
  if (pagesWithoutText > 0) {
    console.log(`⚠️  Pages without text: ${pagesWithoutText}`);
  }

  if (avgWordsPerPage < 20) {
    console.log(`⚠️  Low word count (avg ${Math.round(avgWordsPerPage)} words/page)`);
    console.log("   This might be an image-based PDF that needs OCR");
  } else if (avgWordsPerPage > 100) {
    console.log(`✅ Good extraction quality (avg ${Math.round(avgWordsPerPage)} words/page)`);
  } else {
    console.log(`✅ Moderate extraction (avg ${Math.round(avgWordsPerPage)} words/page)`);
  }
  console.log("");

  // Show specific page if requested
  if (page !== undefined) {
    const pageData = textContent.pages.find((p) => p.pageNumber === page);

    if (!pageData) {
      console.log(`❌ Page ${page} not found`);
      process.exit(1);
    }

    console.log("========================================");
    console.log(`Page ${page} Content (${pageData.wordCount} words)`);
    console.log("========================================");
    console.log(pageData.text);
    console.log("");
  } else {
    // Show sample pages
    console.log("========================================");
    console.log("Sample Pages (first 3 pages with content)");
    console.log("========================================\n");

    const samplePages = textContent.pages
      .filter((p) => p.wordCount > 0)
      .slice(0, 3);

    samplePages.forEach((pageData) => {
      console.log(`--- Page ${pageData.pageNumber} (${pageData.wordCount} words) ---`);
      const preview = pageData.text.substring(0, 300);
      console.log(preview + (pageData.text.length > 300 ? "..." : ""));
      console.log("");
    });

    console.log("========================================");
    console.log(`To view a specific page, use: --page=<number>`);
    console.log("========================================");
  }

  // Word count distribution
  console.log("\nWord Count Distribution:");
  console.log("========================================");
  const distribution: { [key: string]: number } = {
    "0 words": 0,
    "1-50 words": 0,
    "51-100 words": 0,
    "101-200 words": 0,
    "200+ words": 0,
  };

  textContent.pages.forEach((p) => {
    if (p.wordCount === 0) distribution["0 words"]++;
    else if (p.wordCount <= 50) distribution["1-50 words"]++;
    else if (p.wordCount <= 100) distribution["51-100 words"]++;
    else if (p.wordCount <= 200) distribution["101-200 words"]++;
    else distribution["200+ words"]++;
  });

  Object.entries(distribution).forEach(([range, count]) => {
    if (count > 0) {
      const bar = "█".repeat(Math.ceil((count / textContent.totalPages) * 40));
      console.log(`${range.padEnd(15)} ${bar} ${count} pages`);
    }
  });
};

checkExtractedText().catch(console.error);
