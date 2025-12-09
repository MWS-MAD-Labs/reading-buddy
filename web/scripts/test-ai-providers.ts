import { loadEnvConfig } from "@next/env";
import {
  AIProviderError,
  AIService,
  validateAIConfig,
} from "../src/lib/ai";

loadEnvConfig(process.cwd());

const samplePages = [
  {
    pageNumber: 1,
    text: "Lila and her brother Kai find a map hidden inside an old library book. The map points to a grove of whispering trees that only appears at dawn.",
  },
  {
    pageNumber: 2,
    text: "At sunrise they follow the map, solving a riddle about courage to cross a foggy river. On the other side, the trees share a secret about kindness.",
  },
];

const descriptionPages = [
  {
    pageNumber: 1,
    text: "A coming-of-age adventure where two siblings chase a sunrise legend, decode riddles from whispering trees, and learn that bravery is rooted in empathy.",
  },
];

const logHeader = (title: string) => {
  console.log("\n========================================");
  console.log(title);
  console.log("========================================");
};

const run = async () => {
  const config = validateAIConfig();
  console.log(`AI provider: ${config.provider}`);

  // Quiz generation
  logHeader("Quiz Generation");
  const quizResult = await AIService.generateQuiz({
    title: "The Sunrise Map",
    author: "Reading Buddy",
    genre: "Adventure",
    quizType: "classroom",
    questionCount: 5,
    pages: samplePages,
    totalWords: samplePages.reduce(
      (sum, page) => sum + page.text.split(/\s+/).length,
      0,
    ),
    contentSource: "sample pages",
  });

  console.log(
    `Quiz title: ${quizResult.quiz.title ?? "Untitled"} (${quizResult.quiz.questions.length} questions)`,
  );
  console.log(
    `First question: ${quizResult.quiz.questions[0]?.question ?? "N/A"}`,
  );

  // Description generation
  logHeader("Description Generation");
  const descriptionResult = await AIService.generateDescription({
    title: "The Sunrise Map",
    author: "Reading Buddy",
    genre: "Adventure",
    pages: descriptionPages,
    totalWords: descriptionPages[0].text.split(/\s+/).length,
  });

  console.log(
    `Description (first 160 chars): ${descriptionResult.description.slice(0, 160)}...`,
  );

  // Image generation
  logHeader("Image Generation");
  const imageResult = await AIService.generateImage({
    prompt:
      "bright vector badge icon showing a sunrise over a map with playful colors, modern flat style",
    negativePrompt:
      "photographic, cluttered background, text, watermark, dark lighting",
    width: 512,
    height: 512,
  });
  console.log(
    `Image mime: ${imageResult.mimeType} | base64 length: ${imageResult.base64Image.length}`,
  );

  // Error handling check
  logHeader("Error Handling (expected failure)");
  try {
    await AIService.generateQuiz({
      title: "Missing Content",
      quizType: "classroom",
      questionCount: 1,
    });
    console.error("Expected quiz generation to fail but it succeeded.");
    process.exitCode = 1;
  } catch (error) {
    const message =
      error instanceof AIProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown error";
    console.log(`Received expected error: ${message}`);
  }

  console.log("\n✅ AI provider smoke tests finished.");
};

run().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exitCode = 1;
});
