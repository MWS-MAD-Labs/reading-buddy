import { AIProvider, AIProviderError } from "./types";

const DEFAULT_RAG_QUIZ_PATH = "/generate-quiz";
const DEFAULT_RAG_QUIZ_ALT_PATH = "/generate_quiz";
const DEFAULT_RAG_DESCRIPTION_PATH = "/generate-description";
const DEFAULT_DIFFUSER_BADGE_PATH = "/generate-badge-image";

export type LocalProviderConfig = {
  provider: "local";
  ragApiUrl: string;
  ragQuizPath: string;
  ragQuizAltPath: string;
  ragDescriptionPath: string;
  diffuserApiUrl: string;
  diffuserImagePath: string;
};

export type CloudProviderConfig = {
  provider: "cloud";
  geminiApiKey: string;
};

export type ValidatedAIConfig = LocalProviderConfig | CloudProviderConfig;

export const validateAIConfig = (): ValidatedAIConfig => {
  const providerEnv = process.env.AI_PROVIDER;

  if (!providerEnv) {
    throw new AIProviderError(
      'AI_PROVIDER is not configured. Set AI_PROVIDER to "cloud" or "local".',
    );
  }

  const provider = providerEnv.trim().toLowerCase() as AIProvider;

  if (provider !== "cloud" && provider !== "local") {
    throw new AIProviderError(
      `Invalid AI_PROVIDER value: "${providerEnv}". Expected "cloud" or "local".`,
    );
  }

  if (provider === "cloud") {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new AIProviderError(
        "GEMINI_API_KEY is required when AI_PROVIDER=cloud",
        provider,
      );
    }
    return { provider, geminiApiKey };
  }

  const ragApiUrl = process.env.RAG_API_URL;
  const diffuserApiUrl = process.env.DIFFUSER_API_URL;

  if (!ragApiUrl || !diffuserApiUrl) {
    throw new AIProviderError(
      "RAG_API_URL and DIFFUSER_API_URL are required when AI_PROVIDER=local",
      provider,
    );
  }

  return {
    provider,
    ragApiUrl,
    ragQuizPath: process.env.RAG_QUIZ_PATH || DEFAULT_RAG_QUIZ_PATH,
    ragQuizAltPath: process.env.RAG_QUIZ_ALT_PATH || DEFAULT_RAG_QUIZ_ALT_PATH,
    ragDescriptionPath:
      process.env.RAG_DESCRIPTION_PATH || DEFAULT_RAG_DESCRIPTION_PATH,
    diffuserApiUrl,
    diffuserImagePath:
      process.env.DIFFUSER_BADGE_PATH || DEFAULT_DIFFUSER_BADGE_PATH,
  };
};
