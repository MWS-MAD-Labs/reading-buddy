import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { suggestCheckpoints, suggestQuestionCount } from "@/lib/pdf-extractor";

loadEnvConfig(process.cwd());

const testAutoCheckpoints = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing environment variables");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("========================================");
  console.log("Testing Auto-Checkpoint Generation");
  console.log("========================================\n");

  // Test with different books
  const testBooks = [
    { id: 13, name: "Owl Moon" },         // 36 pages
    { id: 14, name: "The Bad Beginning" }, // 69 pages
    { id: 16, name: "Turtles All the Way Down" }, // 189 pages
  ];

  for (const testBook of testBooks) {
    console.log(`\n========================================`);
    console.log(`Book: ${testBook.name}`);
    console.log(`========================================\n`);

    const { data: book, error } = await supabase
      .from("books")
      .select("id, title, page_count, text_extracted_at")
      .eq("id", testBook.id)
      .single();

    if (error || !book || !book.page_count) {
      console.log(`❌ Could not fetch book or missing page count\n`);
      continue;
    }

    console.log(`Title: ${book.title}`);
    console.log(`Pages: ${book.page_count}`);
    console.log(`Text Extracted: ${book.text_extracted_at ? "✅" : "❌"}\n`);

    // Generate checkpoint suggestions
    const checkpointPages = suggestCheckpoints(book.page_count);

    console.log(`Suggested Checkpoints: ${checkpointPages.length}`);
    console.log(`Checkpoint Pages: ${checkpointPages.join(", ")}\n`);

    if (checkpointPages.length === 0) {
      console.log("⚠️  Book too short for checkpoints (< 50 pages)\n");
      continue;
    }

    // Calculate details for each checkpoint
    console.log("Checkpoint Details:");
    console.log("─".repeat(70));

    let previousPage = 1;
    checkpointPages.forEach((checkpointPage, index) => {
      const pageRangeStart = previousPage;
      const pageRangeEnd = checkpointPage;
      const pageRange = pageRangeEnd - pageRangeStart + 1;
      const questionCount = suggestQuestionCount(pageRange);

      console.log(
        `${index + 1}. Page ${String(checkpointPage).padStart(3)} | ` +
        `Range: ${String(pageRangeStart).padStart(3)}-${String(pageRangeEnd).padStart(3)} ` +
        `(${String(pageRange).padStart(3)} pages) | ` +
        `${questionCount} questions`
      );

      previousPage = checkpointPage + 1;
    });

    console.log("─".repeat(70));

    // Show what would be generated
    console.log(`\n📊 Summary:`);
    console.log(`   - Total checkpoints: ${checkpointPages.length}`);
    console.log(`   - Average interval: ${Math.round(book.page_count / checkpointPages.length)} pages`);
    console.log(`   - Total questions: ${checkpointPages.reduce((sum, cp, i) => {
      const start = i === 0 ? 1 : checkpointPages[i - 1] + 1;
      const end = cp;
      return sum + suggestQuestionCount(end - start + 1);
    }, 0)}`);
  }

  console.log("\n========================================");
  console.log("✅ Auto-Checkpoint Test Complete");
  console.log("========================================\n");
};

testAutoCheckpoints().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exitCode = 1;
});
