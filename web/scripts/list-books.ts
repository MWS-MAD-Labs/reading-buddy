import { loadEnvConfig } from "@next/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

loadEnvConfig(process.cwd());

const listBooks = async () => {
  const supabase = getSupabaseAdminClient();

  console.log("========================================");
  console.log("Books in Database");
  console.log("========================================\n");

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author, page_count, text_extracted_at, text_extraction_method")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching books:", error);
    process.exit(1);
  }

  if (!books || books.length === 0) {
    console.log("No books found in database.");
    return;
  }

  console.log(`Found ${books.length} book(s):\n`);

  books.forEach((book) => {
    const extracted = book.text_extracted_at ? "✅" : "❌";
    const method = book.text_extraction_method || "N/A";

    console.log(`[${book.id}] ${book.title}`);
    console.log(`    Author: ${book.author || "Unknown"}`);
    console.log(`    Pages: ${book.page_count || "Unknown"}`);
    console.log(`    Text Extracted: ${extracted} (${method})`);
    if (book.text_extracted_at) {
      console.log(`    Extracted At: ${new Date(book.text_extracted_at).toLocaleString()}`);
    }
    console.log("");
  });

  const notExtracted = books.filter((b) => !b.text_extracted_at);
  if (notExtracted.length > 0) {
    console.log("========================================");
    console.log(`${notExtracted.length} book(s) need text extraction:`);
    console.log("========================================\n");
    notExtracted.forEach((book) => {
      console.log(`  npm run extract:book-text -- --bookId=${book.id}  # ${book.title}`);
    });
  }
};

listBooks().catch(console.error);
