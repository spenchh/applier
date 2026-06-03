export type AIProviderName = "mock" | "openai" | "anthropic";

export type AIWrapperConfig = {
  provider: AIProviderName;
  model?: string | null;
  instructions?: string | null;
};

export type AIWrapperStatus = {
  provider: AIProviderName;
  model: string;
  configured: boolean;
  mode: "local_mock" | "external_provider";
  warning?: string;
};

export function getAIWrapperStatus(config: AIWrapperConfig): AIWrapperStatus {
  if (config.provider === "openai") {
    return {
      provider: "openai",
      model: config.model || "gpt-4.1-mini",
      configured: Boolean(process.env.OPENAI_API_KEY),
      mode: "external_provider",
      warning: process.env.OPENAI_API_KEY ? undefined : "OPENAI_API_KEY is not configured, so generation should fall back to mock mode.",
    };
  }

  if (config.provider === "anthropic") {
    return {
      provider: "anthropic",
      model: config.model || "claude-3-5-sonnet-latest",
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      mode: "external_provider",
      warning: process.env.ANTHROPIC_API_KEY ? undefined : "ANTHROPIC_API_KEY is not configured, so generation should fall back to mock mode.",
    };
  }

  return {
    provider: "mock",
    model: config.model || "deterministic-local-mock",
    configured: true,
    mode: "local_mock",
  };
}

export function safeProviderName(value: string | null | undefined): AIProviderName {
  if (value === "openai" || value === "anthropic") return value;
  return "mock";
}
