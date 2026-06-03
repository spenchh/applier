/**
 * Centralized, validated access to environment variables.
 *
 * We deliberately do NOT throw at import time for optional/provider keys so the
 * app can boot and run the full demo flow with the `mock` provider and no
 * secrets configured. Required-but-missing values for a selected provider are
 * surfaced as friendly errors at the point of use instead.
 */

export type LlmProviderName = "anthropic" | "openai" | "mock";

function str(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  databaseUrl: str("DATABASE_URL", "file:./dev.db"),
  appBaseUrl: str("APP_BASE_URL", "http://localhost:3000"),

  llmProvider: (() => {
    const v = str("LLM_PROVIDER", "mock").toLowerCase();
    return (["anthropic", "openai", "mock"].includes(v) ? v : "mock") as LlmProviderName;
  })(),

  anthropicApiKey: str("ANTHROPIC_API_KEY"),
  anthropicModel: str("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
  openaiApiKey: str("OPENAI_API_KEY"),
  openaiModel: str("OPENAI_MODEL", "gpt-4o-mini"),

  encryptionKey: str("ENCRYPTION_KEY"),
  nextAuthSecret: str("NEXTAUTH_SECRET"),

  emailFrom: str("EMAIL_FROM"),
  resendApiKey: str("RESEND_API_KEY"),
  gmailClientId: str("GMAIL_CLIENT_ID"),
  gmailClientSecret: str("GMAIL_CLIENT_SECRET"),

  get isEmailConfigured(): boolean {
    return Boolean(this.resendApiKey && this.emailFrom);
  },
};

/** Returns the effective provider, accounting for missing keys. */
export function effectiveLlmProvider(configured?: string): LlmProviderName {
  const provider = (configured || env.llmProvider) as LlmProviderName;
  if (provider === "anthropic" && !env.anthropicApiKey) return "mock";
  if (provider === "openai" && !env.openaiApiKey) return "mock";
  return provider;
}
