import { GoogleGenerativeAI } from "@google/generative-ai";
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
import type { CloudProviderConfig } from "../validate-config";

type GeminiQuizResponse = {
  title?: string;
  description?: string;
  questions?: QuizQuestion[];
};

type GeminiDescriptionResponse = {
  description?: string;
  text?: string;
  content?: string;
};

export class CloudAIProvider implements IAIProvider {
  readonly type = "cloud";
  private readonly genAI: GoogleGenerativeAI;

  constructor(config: CloudProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }

  async generateQuiz(
    input: QuizGenerationInput,
  ): Promise<QuizGenerationOutput> {
    if (!input.pages || !input.pages.length) {
      throw new AIProviderError(
        "Gemini provider requires extracted text pages for quiz generation (PDF upload is not supported).",
        this.type,
      );
    }

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const prompt = this.buildQuizPrompt(input);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = this.parseJson(responseText);
    const quizPayload = this.normalizeQuizPayload(
      parsed,
      input.title,
      input.questionCount,
    );

    return {
      quiz: quizPayload,
      questionCount: quizPayload.questions.length || input.questionCount,
      contentSource:
        input.contentSource ||
        (input.pages && input.pages.length ? "extracted_text" : undefined),
      provider: this.type,
    };
  }

  async generateDescription(
    input: DescriptionGenerationInput,
  ): Promise<DescriptionGenerationOutput> {
    const content = this.buildDescriptionContent(input);

    if (!content) {
      throw new AIProviderError(
        "Gemini provider requires extracted text to generate descriptions.",
        this.type,
      );
    }

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const prompt = this.buildDescriptionPrompt(input, content);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = this.parseJson(responseText);
    const description = this.extractDescription(parsed);

    if (!description) {
      throw new AIProviderError(
        "Gemini response did not include a description.",
        this.type,
        parsed,
      );
    }

    return { description, provider: this.type };
  }

  async generateImage(
    input: ImageGenerationInput,
  ): Promise<ImageGenerationOutput> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
    });

    const sizeHint =
      input.width && input.height
        ? `Target size: ${input.width}x${input.height}px.`
        : input.width
          ? `Target width: ${input.width}px.`
          : input.height
            ? `Target height: ${input.height}px.`
            : "";

    const prompt = [
      input.prompt,
      input.negativePrompt
        ? `Avoid: ${input.negativePrompt} (strict negative prompt).`
        : null,
      sizeHint,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await model.generateContent(prompt);

    const parts = result.response.candidates?.[0]?.content?.parts || [];
    const inlineData = parts.find(
      (part: unknown) =>
        (part as { inlineData?: { data?: string } }).inlineData,
    ) as { inlineData?: { data?: string; mimeType?: string } } | undefined;

    const base64Image = inlineData?.inlineData?.data;
    const mimeType = inlineData?.inlineData?.mimeType || "image/png";

    if (!base64Image) {
      throw new AIProviderError(
        "Gemini image generation did not return image data.",
        this.type,
        result.response,
      );
    }

    return { base64Image, mimeType, provider: this.type };
  }

  private buildQuizPrompt(input: QuizGenerationInput) {
    const pageRange =
      input.pageRangeStart && input.pageRangeEnd
        ? `Pages ${input.pageRangeStart}-${input.pageRangeEnd}`
        : "Provided pages";

    const content = input.pages
      ?.map((page) => `[Page ${page.pageNumber}]\n${page.text}`)
      .join("\n\n");

    const checkpointLine =
      input.quizType === "checkpoint" && input.checkpointPage
        ? `This is a checkpoint quiz at page ${input.checkpointPage}.`
        : "";

    return `
You are an educational assistant creating a ${input.quizType} quiz for students aged 10-16.

Book: "${input.title}"${input.author ? ` by ${input.author}` : ""}${
      input.genre ? `\nGenre: ${input.genre}` : ""
    }
${checkpointLine}
${pageRange}
Target question count: ${input.questionCount}

Use the provided book content to generate multiple-choice questions:
${content}

Instructions:
- Focus strictly on the provided content. Do not invent facts.
- Include a mix of easy, medium, and hard questions.
- Ensure every question has four options and a zero-based answerIndex pointing to the correct option.
- Provide a brief explanation for each correct answer.

Respond with JSON only:
{
  "title": "${input.title} Quiz",
  "description": "Optional short quiz description",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Brief reason"
    }
  ]
}`;
  }

  private buildDescriptionContent(input: DescriptionGenerationInput) {
    if (input.pages && input.pages.length) {
      return input.pages
        .map((page) => `[Page ${page.pageNumber}]\n${page.text}`)
        .join("\n\n");
    }

    if (input.textPreview) {
      return input.textPreview;
    }

    return null;
  }

  private buildDescriptionPrompt(
    input: DescriptionGenerationInput,
    content: string,
  ) {
    return `Generate a compelling and intriguing book description for the following book:

Title: ${input.title}
Author: ${input.author}
${input.genre ? `Genre: ${input.genre}` : ""}

Text Preview:
${content}

Please write a SHORT, punchy description that:
1. Hooks readers with an intriguing opening line
2. Creates mystery or excitement without revealing too much
3. Is appropriate for a library catalog
4. Avoids spoilers but teases the story
5. Is MAXIMUM 50 words (approximately 250-300 characters)
6. Uses vivid, engaging language that makes people want to read the book

CRITICAL FORMATTING RULES:
- Write in PLAIN TEXT ONLY
- DO NOT use asterisks (*) for italics or bold
- DO NOT use underscores (_) for emphasis
- DO NOT use any markdown symbols
- DO NOT format the title or book name in italics
- Write everything as plain, unformatted text
- Keep it in ONE continuous paragraph
- No special formatting whatsoever

IMPORTANT: Keep it under 50 words. Be concise and impactful.
Write in an exciting, cinematic style. Think movie trailer tagline, not full summary.

Return ONLY the description text in plain format, without any preamble or additional commentary.

Respond with JSON only:
{
  "description": "Your plain text description here"
}`;
  }

  private parseJson(raw: string) {
    const trimmed = raw.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new AIProviderError(
        "Failed to parse JSON response from Gemini.",
        this.type,
        raw,
      );
    }
  }

  private normalizeQuizPayload(
    result: GeminiQuizResponse,
    fallbackTitle: string,
    questionCount: number,
  ): QuizPayload {
    const questions = Array.isArray(result.questions) ? result.questions : [];

    if (!questions.length) {
      throw new AIProviderError(
        "Gemini response did not include quiz questions.",
        this.type,
        result,
      );
    }

    const normalizedQuestions: QuizQuestion[] = questions.map(
      (question, index) => {
        const options = Array.isArray(question.options)
          ? question.options.map((option) => String(option))
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
            : typeof (question as { correct_answer?: number })
                  .correct_answer === "number"
              ? (question as { correct_answer: number }).correct_answer
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

    return {
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
  }

  private extractDescription(parsed: GeminiDescriptionResponse) {
    let description: string | null = null;

    if (parsed.description && typeof parsed.description === "string") {
      description = parsed.description;
    } else if (parsed.text && typeof parsed.text === "string") {
      description = parsed.text;
    } else if (parsed.content && typeof parsed.content === "string") {
      description = parsed.content;
    }

    if (!description) {
      return null;
    }

    // Strip markdown formatting
    return description
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold: **text** -> text
      .replace(/\*(.+?)\*/g, "$1") // Remove italics: *text* -> text
      .replace(/_(.+?)_/g, "$1") // Remove underscores: _text_ -> text
      .replace(/^#+\s+/gm, "") // Remove headers: # text -> text
      .replace(/\n\n+/g, " ") // Replace multiple newlines with single space
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }
}
