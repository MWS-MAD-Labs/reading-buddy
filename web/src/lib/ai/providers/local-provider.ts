import { Buffer } from "node:buffer";
import type { IAIProvider } from "../provider-interface";
import type {
  DescriptionGenerationInput,
  DescriptionGenerationOutput,
  ImageGenerationInput,
  ImageGenerationOutput,
  QuizGenerationInput,
  QuizGenerationOutput,
  QuizPayload,
  QuizQuestion,
} from "../types";
import { AIProviderError } from "../types";
import type { LocalProviderConfig } from "../validate-config";

type RagQuizResponse = {
  title?: string;
  description?: string;
  questions?: QuizQuestion[];
};

type RagDescriptionResponse = {
  description?: string;
};

export class LocalAIProvider implements IAIProvider {
  readonly type = "local";
  private readonly ragApiUrl: string;
  private readonly ragQuizPath: string;
  private readonly ragQuizAltPath: string;
  private readonly ragDescriptionPath: string;
  private readonly diffuserApiUrl: string;
  private readonly diffuserImagePath: string;

  constructor(config: LocalProviderConfig) {
    this.ragApiUrl = config.ragApiUrl;
    this.ragQuizPath = config.ragQuizPath;
    this.ragQuizAltPath = config.ragQuizAltPath;
    this.ragDescriptionPath = config.ragDescriptionPath;
    this.diffuserApiUrl = config.diffuserApiUrl;
    this.diffuserImagePath = config.diffuserImagePath;
  }

  async generateQuiz(
    input: QuizGenerationInput,
  ): Promise<QuizGenerationOutput> {
    console.log("[LocalAIProvider] generateQuiz input:", {
      title: input.title,
      quizType: input.quizType,
      contentSource: input.contentSource,
      pagesCount: input.pages?.length ?? 0,
      hasPdfUrl: !!input.pdfUrl,
      totalWords: input.totalWords,
      questionCount: input.questionCount,
    });

    const target = this.buildRagEndpoint(this.ragQuizPath);
    const fallback = this.buildRagEndpoint(this.ragQuizAltPath);

    let payload: QuizPayload;

    if (input.pages && input.pages.length) {
      try {
        payload = await this.generateQuizFromText(input, target, fallback);
      } catch (error) {
        if (input.pdfUrl) {
          console.warn(
            "[LocalAIProvider] Text quiz generation failed, retrying with PDF:",
            error,
          );
          payload = await this.generateQuizFromPdf(input, target, fallback);
        } else {
          throw error;
        }
      }
    } else {
      console.log(
        "[LocalAIProvider] No pages provided, attempting PDF generation",
      );
      payload = await this.generateQuizFromPdf(input, target, fallback);
    }

    const contentSource =
      input.contentSource ||
      (input.pages && input.pages.length ? "extracted_text" : "pdf");

    return {
      quiz: payload,
      questionCount: payload.questions.length || input.questionCount,
      contentSource,
      provider: this.type,
    };
  }

  async generateDescription(
    input: DescriptionGenerationInput,
  ): Promise<DescriptionGenerationOutput> {
    const target = this.buildRagEndpoint(this.ragDescriptionPath);
    const fallbackPages =
      input.pages && input.pages.length
        ? input.pages
        : input.textPreview
          ? [
              {
                pageNumber: 0,
                text: input.textPreview,
              },
            ]
          : null;

    if (fallbackPages) {
      const description = await this.generateDescriptionFromText(
        input,
        target,
        fallbackPages,
      );
      if (description) {
        return { description, provider: this.type };
      }
    }

    if (!input.pdfUrl) {
      throw new AIProviderError(
        "No extracted text or PDF available for description generation.",
        this.type,
      );
    }

    const description = await this.generateDescriptionFromPdf(
      input,
      target,
      input.pdfUrl,
    );

    return { description, provider: this.type };
  }

  async generateImage(
    input: ImageGenerationInput,
  ): Promise<ImageGenerationOutput> {
    const endpoint = this.buildDiffuserEndpoint(this.diffuserImagePath, true);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: input.prompt,
        negative_prompt: input.negativePrompt,
        width: input.width ?? 512,
        height: input.height ?? 512,
        num_inference_steps: 40,
        guidance_scale: 11,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIProviderError(
        `Diffuser API error: ${response.statusText} - ${errorText}`,
        this.type,
      );
    }

    const result = await response.json();
    const base64Image = await this.extractBase64Image(result);

    if (!base64Image) {
      throw new AIProviderError(
        "Diffuser API did not return an image.",
        this.type,
        result,
      );
    }

    return {
      base64Image,
      mimeType: "image/png",
      provider: this.type,
    };
  }

  private async generateQuizFromText(
    input: QuizGenerationInput,
    target: string,
    fallback: string,
  ): Promise<QuizPayload> {
    const requestBody = JSON.stringify({
      title: input.title,
      author: input.author,
      genre: input.genre,
      quizType: input.quizType,
      questionCount: input.questionCount,
      pageRangeStart: input.pageRangeStart,
      pageRangeEnd: input.pageRangeEnd,
      checkpointPage: input.checkpointPage,
      pages: input.pages,
      totalWords: input.totalWords,
      description: input.description,
      contentSource: input.contentSource,
    });

    console.log("[LocalAIProvider] Text quiz request:", {
      title: input.title,
      quizType: input.quizType,
      contentSource: input.contentSource,
      pagesCount: input.pages?.length ?? 0,
      totalWords: input.totalWords,
      hasDescription: !!input.description,
      endpoint: target,
      bodySize: requestBody.length,
    });

    const response = await this.postWithFallback(target, fallback, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const result: RagQuizResponse = await response.json();
    return this.normalizeQuizPayload(result, input.title, input.questionCount);
  }

  private async generateQuizFromPdf(
    input: QuizGenerationInput,
    target: string,
    fallback: string,
  ): Promise<QuizPayload> {
    if (!input.pdfUrl) {
      throw new AIProviderError(
        "No extracted text or PDF available for quiz generation.",
        this.type,
      );
    }

    console.log("[LocalAIProvider] Fetching PDF from:", input.pdfUrl);
    const pdfBlob = await this.fetchPdfBlob(input.pdfUrl);
    console.log("[LocalAIProvider] PDF fetched, size:", pdfBlob.size, "bytes");

    const formData = new FormData();
    formData.append("file", pdfBlob, "ebook.pdf");
    formData.append("title", input.title);
    if (input.author) formData.append("author", input.author);
    if (input.genre) formData.append("genre", input.genre);
    formData.append("quizType", input.quizType);
    formData.append("questionCount", String(input.questionCount));
    if (input.pageRangeStart)
      formData.append("pageRangeStart", String(input.pageRangeStart));
    if (input.pageRangeEnd)
      formData.append("pageRangeEnd", String(input.pageRangeEnd));
    if (input.checkpointPage)
      formData.append("checkpointPage", String(input.checkpointPage));
    if (input.description) formData.append("description", input.description);

    console.log("[LocalAIProvider] PDF quiz request:", {
      title: input.title,
      quizType: input.quizType,
      pdfUrl: input.pdfUrl,
      endpoint: target,
    });

    const response = await this.postWithFallback(target, fallback, {
      method: "POST",
      body: formData,
    });

    const result: RagQuizResponse = await response.json();
    return this.normalizeQuizPayload(result, input.title, input.questionCount);
  }

  private async generateDescriptionFromText(
    input: DescriptionGenerationInput,
    target: string,
    pages: NonNullable<DescriptionGenerationInput["pages"]>,
  ) {
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.title,
        author: input.author,
        genre: input.genre,
        pages,
        totalWords: input.totalWords,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("RAG API error (text path):", errorText);
      return null;
    }

    const result: RagDescriptionResponse = await response.json();
    return typeof result.description === "string" ? result.description : null;
  }

  private async generateDescriptionFromPdf(
    input: DescriptionGenerationInput,
    target: string,
    pdfUrl: string,
  ) {
    const pdfBlob = await this.fetchPdfBlob(pdfUrl);
    const formData = new FormData();
    formData.append("file", pdfBlob, "ebook.pdf");

    const response = await fetch(target, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIProviderError(
        `RAG API error: ${response.statusText} - ${errorText}`,
        this.type,
      );
    }

    const result: RagDescriptionResponse = await response.json();

    if (!result.description) {
      throw new AIProviderError(
        "RAG API did not return a description.",
        this.type,
        result,
      );
    }

    return result.description;
  }

  private async fetchPdfBlob(pdfUrl: string) {
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new AIProviderError(
        `Failed to fetch PDF: ${pdfResponse.statusText}`,
        this.type,
      );
    }
    return pdfResponse.blob();
  }

  private async postWithFallback(
    target: string,
    fallback: string,
    init: RequestInit,
  ) {
    console.log("[LocalAIProvider] Attempting POST to:", target);
    const startTime = Date.now();

    try {
      const response = await fetch(target, init);
      const elapsed = Date.now() - startTime;
      console.log(`[LocalAIProvider] Response from ${target} (${elapsed}ms):`, {
        status: response.status,
        statusText: response.statusText,
      });

      if (response.ok) {
        return response;
      }

      if (response.status !== 404) {
        const errorText = await response.text();
        throw new AIProviderError(
          `RAG API error: ${response.statusText} - ${errorText}`,
          this.type,
        );
      }

      console.log(
        "[LocalAIProvider] Got 404, retrying with fallback:",
        fallback,
      );
      const retryResponse = await fetch(fallback, init);
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new AIProviderError(
          `RAG API error: ${retryResponse.statusText} - ${errorText}`,
          this.type,
        );
      }

      return retryResponse;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[LocalAIProvider] Fetch failed after ${elapsed}ms:`, {
        endpoint: target,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private normalizeQuizPayload(
    result: RagQuizResponse,
    fallbackTitle: string,
    questionCount: number,
  ): QuizPayload {
    const questions = Array.isArray(result.questions) ? result.questions : [];

    if (!questions.length) {
      throw new AIProviderError(
        "RAG API did not return quiz questions.",
        this.type,
        result,
      );
    }

    const normalizedQuestions: QuizQuestion[] = questions.map(
      (question, index) => {
        const options = Array.isArray(question.options)
          ? question.options.map((option: any) => String(option))
          : [];

        if (!options.length) {
          throw new AIProviderError(
            `Question ${index + 1} is missing options.`,
            this.type,
            question,
          );
        }

        const answerIndex =
          typeof question.answerIndex === "number"
            ? question.answerIndex
            : typeof (question as unknown as { correct_answer?: number })
                  .correct_answer === "number"
              ? (question as unknown as { correct_answer: number })
                  .correct_answer
              : 0;

        const clampedAnswerIndex =
          answerIndex >= 0 && answerIndex < options.length ? answerIndex : 0;

        return {
          question:
            typeof question.question === "string"
              ? question.question
              : `Question ${index + 1}`,
          options,
          answerIndex: clampedAnswerIndex,
          explanation:
            typeof question.explanation === "string"
              ? question.explanation
              : undefined,
          correctFeedback:
            typeof question.correctFeedback === "string"
              ? question.correctFeedback
              : undefined,
          incorrectFeedback:
            typeof question.incorrectFeedback === "string"
              ? question.incorrectFeedback
              : undefined,
        };
      },
    );

    const quizPayload: QuizPayload = {
      title:
        typeof result.title === "string" && result.title.trim().length
          ? result.title
          : fallbackTitle,
      description:
        typeof result.description === "string" ? result.description : undefined,
      questions:
        questionCount > 0
          ? normalizedQuestions.slice(0, questionCount)
          : normalizedQuestions,
    };

    return quizPayload;
  }

  private normalizeBase64(image: string) {
    return image.replace(/^data:image\/\w+;base64,/, "").trim();
  }

  private async extractBase64Image(result: any): Promise<string | null> {
    const base64Image =
      result?.image_base64 ||
      result?.base64 ||
      result?.imageBase64 ||
      result?.image_data ||
      result?.data;

    if (typeof base64Image === "string") {
      return this.normalizeBase64(base64Image);
    }

    const imagePath =
      result?.image_url ||
      result?.url ||
      result?.imageUrl ||
      result?.image ||
      result?.output_url ||
      result?.output ||
      result?.image_path ||
      result?.path;

    if (!imagePath) {
      return null;
    }

    const imageUrl = this.buildDiffuserEndpoint(imagePath, true);
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      throw new AIProviderError(
        `Failed to download generated image: ${imageResponse.statusText} - ${errorText}`,
        this.type,
      );
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return buffer.toString("base64");
  }

  private buildRagEndpoint(path: string) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.ragApiUrl}${normalizedPath}`;
  }

  private buildDiffuserEndpoint(path: string, allowAbsolute = false) {
    if (allowAbsolute && /^https?:\/\//i.test(path)) {
      return path;
    }
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.diffuserApiUrl}${normalizedPath}`;
  }
}
