import type { IAIProvider } from "./provider-interface";
import { CloudAIProvider } from "./providers/cloud-provider";
import { LocalAIProvider } from "./providers/local-provider";
import type { ValidatedAIConfig } from "./validate-config";
import { validateAIConfig } from "./validate-config";

let cachedProvider: IAIProvider | null = null;
let cachedConfig: ValidatedAIConfig | null = null;

export const getAIProvider = (): IAIProvider => {
  if (cachedProvider) {
    return cachedProvider;
  }

  cachedConfig = validateAIConfig();

  cachedProvider =
    cachedConfig.provider === "cloud"
      ? new CloudAIProvider(cachedConfig)
      : new LocalAIProvider(cachedConfig);

  return cachedProvider;
};

export const getAIProviderConfig = () => cachedConfig;

export const resetAIProviderCache = () => {
  cachedProvider = null;
  cachedConfig = null;
};
