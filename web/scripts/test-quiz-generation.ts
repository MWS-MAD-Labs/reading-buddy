import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

loadEnvConfig(process.cwd());

const testQuizGeneration = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !geminiKey) {
    throw new Error("Missing environment variables");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("========================================");
  console.log("Testing Enhanced Quiz Generation");
  console.log("========================================\n");

  // Test with Owl Moon (book ID 13 - has extracted text)
  const bookId = 13;

  console.log(`Fetching book ${bookId}...`);
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, author, genre, page_count, page_text_content, text_extracted_at")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    throw new Error("Book not found");
  }

  console.log(`✓ Book: ${book.title} by ${book.author}`);
  console.log(`  Pages: ${book.page_count}`);
  console.log(`  Text extracted: ${book.text_extracted_at ? "✅" : "❌"}\n`);

  if (!book.page_text_content) {
    throw new Error("No text content available for this book");
  }

  const textContent = book.page_text_content as {
    pages: { pageNumber: number; text: string; wordCount: number }[];
    totalPages: number;
    totalWords: number;
  };

  console.log(`Total words in book: ${textContent.totalWords}`);
  console.log(`Total pages with text: ${textContent.pages.length}\n`);

  // Test 1: Generate quiz from page range 1-15
  console.log("========================================");
  console.log("Test 1: Quiz from Pages 1-15");
  console.log("========================================\n");

  const pageRangeStart = 1;
  const pageRangeEnd = 15;
  const questionCount = 5;

  const pagesInRange = textContent.pages.filter(
    (p) => p.pageNumber >= pageRangeStart && p.pageNumber <= pageRangeEnd
  );

  const bookContent = pagesInRange
    .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
    .join('\n\n');

  console.log(`Pages in range: ${pagesInRange.length}`);
  console.log(`Words in range: ${pagesInRange.reduce((sum, p) => sum + p.wordCount, 0)}`);
  console.log(`Content preview (first 200 chars):\n${bookContent.substring(0, 200)}...\n`);

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const prompt = `
You are an educational assistant creating a classroom quiz for students aged 10-16.

Book: "${book.title}" by ${book.author}
Content: Pages ${pageRangeStart}-${pageRangeEnd}
Genre: ${book.genre || 'General'}

Below is the actual content from the book:
"""
${bookContent}
"""

Generate ${questionCount} multiple-choice questions that:
1. Test comprehension of key concepts and plot points from the provided content
2. Are appropriate for the target age group (10-16 years old)
3. Include varied difficulty levels (mix of easy, medium, and hard)
4. Focus on important themes, character development, and story elements
5. Have clear, unambiguous correct answers

Return JSON with this exact structure:
{
  "title": "${book.title} Quiz - pages ${pageRangeStart}-${pageRangeEnd}",
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "difficulty": "easy|medium|hard",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}

Important: answerIndex should be 0-3 (zero-based index of the correct option).
`;

  console.log("Generating quiz with Gemini 2.5 Flash...\n");

  const startTime = Date.now();
  const result = await model.generateContent(prompt);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const response = result.response;
  const text = response.text();

  console.log(`✓ Generated in ${duration}s\n`);

  let quizPayload: any;
  try {
    quizPayload = JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    console.log("Raw response:", text);
    throw err;
  }

  console.log("========================================");
  console.log("Generated Quiz");
  console.log("========================================\n");
  console.log(`Title: ${quizPayload.title}`);
  console.log(`Questions: ${quizPayload.questions?.length || 0}\n`);

  if (quizPayload.questions) {
    quizPayload.questions.forEach((q: any, i: number) => {
      console.log(`Q${i + 1}: ${q.question}`);
      console.log(`   Difficulty: ${q.difficulty || 'N/A'}`);
      q.options?.forEach((opt: string, idx: number) => {
        const marker = idx === q.answerIndex ? "✓" : " ";
        console.log(`   [${marker}] ${opt}`);
      });
      if (q.explanation) {
        console.log(`   💡 ${q.explanation}`);
      }
      console.log("");
    });
  }

  console.log("========================================");
  console.log("Quiz Quality Assessment");
  console.log("========================================");

  const hasAllFields = quizPayload.questions?.every((q: any) =>
    q.question && q.options?.length === 4 && typeof q.answerIndex === 'number'
  );

  const hasDifficulty = quizPayload.questions?.every((q: any) => q.difficulty);
  const hasExplanations = quizPayload.questions?.every((q: any) => q.explanation);

  console.log(`✓ All required fields present: ${hasAllFields ? "✅" : "❌"}`);
  console.log(`✓ Difficulty levels assigned: ${hasDifficulty ? "✅" : "❌"}`);
  console.log(`✓ Explanations provided: ${hasExplanations ? "✅" : "❌"}`);
  console.log(`✓ Question count matches: ${quizPayload.questions?.length === questionCount ? "✅" : "❌"}`);

  console.log("\n✅ Test completed successfully!");
};

testQuizGeneration().catch((error) => {
  console.error("\n❌ Test failed:", error);
  process.exitCode = 1;
});
