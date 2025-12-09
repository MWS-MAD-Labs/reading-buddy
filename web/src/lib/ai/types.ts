export type AIProvider = "cloud" | "local";

export type QuizType = "classroom" | "checkpoint";

export type PageContent = {
  pageNumber: number;
  text: string;
  wordCount?: number;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
};

export type QuizPayload = {
  title?: string;
  description?: string;
  questions: QuizQuestion[];
};

export interface QuizGenerationInput {
  title: string;
  author?: string;
  genre?: string;
  description?: string;
  quizType: QuizType;
  questionCount: number;
  checkpointPage?: number;
  pageRangeStart?: number;
  pageRangeEnd?: number;
  contentSource?: string;
  pages?: PageContent[];
  totalWords?: number;
  pdfUrl?: string;
}

export interface QuizGenerationOutput {
  quiz: QuizPayload;
  questionCount: number;
  contentSource?: string;
  provider: AIProvider;
}

export interface DescriptionGenerationInput {
  title: string;
  author?: string;
  genre?: string;
  pages?: PageContent[];
  totalWords?: number;
  textPreview?: string;
  pdfUrl?: string;
}

export interface DescriptionGenerationOutput {
  description: string;
  provider: AIProvider;
}

export interface ImageGenerationInput {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
}

export interface ImageGenerationOutput {
  base64Image: string;
  mimeType: string;
  provider: AIProvider;
}

export class AIProviderError extends Error {
  provider?: AIProvider;
  cause?: unknown;

  constructor(message: string, provider?: AIProvider, cause?: unknown) {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
    this.cause = cause;
    Object.setPrototypeOf(this, AIProviderError.prototype);
  }
}
