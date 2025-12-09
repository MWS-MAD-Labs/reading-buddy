import { getAIProvider } from "./provider-factory";
import type {
  AIProvider,
  DescriptionGenerationInput,
  DescriptionGenerationOutput,
  ImageGenerationInput,
  ImageGenerationOutput,
  QuizGenerationInput,
  QuizGenerationOutput,
} from "./types";
import { AIProviderError } from "./types";

const wrapError = (operation: string, provider: AIProvider, error: unknown) => {
  if (error instanceof AIProviderError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[AIService][${provider}] ${operation} failed:`, error);

  return new AIProviderError(
    `AI ${operation} failed: ${message}`,
    provider as never,
    error,
  );
};

export class AIService {
  static async generateQuiz(
    input: QuizGenerationInput,
  ): Promise<QuizGenerationOutput> {
    const provider = getAIProvider();
    console.log(
      `[AIService][${provider.type}] Starting quiz generation for "${input.title}"...`,
    );
    const startTime = Date.now();

    try {
      const result = await provider.generateQuiz(input);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `[AIService][${provider.type}] ✓ Quiz generation completed in ${duration}s (${result.questionCount} questions)`,
      );
      return result;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(
        `[AIService][${provider.type}] ✗ Quiz generation failed after ${duration}s`,
      );
      throw wrapError("quiz generation", provider.type, error);
    }
  }

  static async generateDescription(
    input: DescriptionGenerationInput,
  ): Promise<DescriptionGenerationOutput> {
    const provider = getAIProvider();
    console.log(
      `[AIService][${provider.type}] Starting description generation for "${input.title}"...`,
    );
    const startTime = Date.now();

    try {
      const result = await provider.generateDescription(input);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `[AIService][${provider.type}] ✓ Description generation completed in ${duration}s (${result.description.length} chars)`,
      );
      return result;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(
        `[AIService][${provider.type}] ✗ Description generation failed after ${duration}s`,
      );
      throw wrapError("description generation", provider.type, error);
    }
  }

  static async generateImage(
    input: ImageGenerationInput,
  ): Promise<ImageGenerationOutput> {
    const provider = getAIProvider();
    console.log(`[AIService][${provider.type}] Starting image generation...`);
    const startTime = Date.now();

    try {
      const result = await provider.generateImage(input);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `[AIService][${provider.type}] ✓ Image generation completed in ${duration}s (${result.mimeType})`,
      );
      return result;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(
        `[AIService][${provider.type}] ✗ Image generation failed after ${duration}s`,
      );
      throw wrapError("image generation", provider.type, error);
    }
  }
}
