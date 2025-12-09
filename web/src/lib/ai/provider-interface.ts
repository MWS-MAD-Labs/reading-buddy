import type {
  DescriptionGenerationInput,
  DescriptionGenerationOutput,
  ImageGenerationInput,
  ImageGenerationOutput,
  QuizGenerationInput,
  QuizGenerationOutput,
  AIProvider,
} from "./types";

export interface IAIProvider {
  readonly type: AIProvider;
  generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput>;
  generateDescription(
    input: DescriptionGenerationInput,
  ): Promise<DescriptionGenerationOutput>;
  generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
}
