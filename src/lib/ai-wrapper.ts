import { z } from "zod";

export type AIProviderName = "mock" | "openai" | "anthropic";

export type AIWrapperConfig = {
  provider: AIProviderName;
  model?: string | null;
  instructions?: string | null;
};

export type AIWrapperStatus = {
  provider: AIProviderName;
  effectiveProvider: AIProviderName;
  model: string;
  configured: boolean;
  mode: "local_mock" | "external_provider";
  warning?: string;
};

export type AITextRequest = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export interface AIProvider {
  name: AIProviderName;
  generateText(request: AITextRequest): Promise<string>;
}

function defaultModel(provider: AIProviderName): string {
  if (provider === "openai") return process.env.OPENAI_MODEL || "gpt-4.1-mini";
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  return "deterministic-local-mock";
}

export function getAIWrapperStatus(config: AIWrapperConfig): AIWrapperStatus {
  const model = config.model || defaultModel(config.provider);
  if (config.provider === "openai") {
    const configured = Boolean(process.env.OPENAI_API_KEY);
    return {
      provider: "openai",
      effectiveProvider: configured ? "openai" : "mock",
      model,
      configured,
      mode: configured ? "external_provider" : "local_mock",
      warning: configured ? undefined : "OPENAI_API_KEY is not configured, so generation will fall back to mock mode.",
    };
  }

  if (config.provider === "anthropic") {
    const configured = Boolean(process.env.ANTHROPIC_API_KEY);
    return {
      provider: "anthropic",
      effectiveProvider: configured ? "anthropic" : "mock",
      model,
      configured,
      mode: configured ? "external_provider" : "local_mock",
      warning: configured ? undefined : "ANTHROPIC_API_KEY is not configured, so generation will fall back to mock mode.",
    };
  }

  return {
    provider: "mock",
    effectiveProvider: "mock",
    model,
    configured: true,
    mode: "local_mock",
  };
}

export function safeProviderName(value: string | null | undefined): AIProviderName {
  if (value === "openai" || value === "anthropic") return value;
  return "mock";
}

export function getAIProvider(config: AIWrapperConfig): AIProvider {
  const status = getAIWrapperStatus(config);
  if (status.effectiveProvider === "openai") return new OpenAIProvider(status.model);
  if (status.effectiveProvider === "anthropic") return new AnthropicProvider(status.model);
  return new MockProvider(status.model, config.instructions);
}

export async function generateAIText(config: AIWrapperConfig, request: AITextRequest): Promise<string> {
  return getAIProvider(config).generateText(request);
}

export async function generateAIObject<T>(
  config: AIWrapperConfig,
  request: AITextRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  const text = await generateAIText(config, {
    ...request,
    system: [request.system, "Return only valid JSON. Do not include prose or code fences."].filter(Boolean).join("\n\n"),
  });
  return schema.parse(extractJson(text));
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.search(/[[{]/);
    if (start < 0) throw new Error("AI response did not contain JSON.");
    for (let end = candidate.length; end > start; end -= 1) {
      try {
        return JSON.parse(candidate.slice(start, end));
      } catch {
        // Keep shrinking until a balanced JSON object/array parses.
      }
    }
    throw new Error("AI response JSON could not be parsed.");
  }
}

class MockProvider implements AIProvider {
  name: AIProviderName = "mock";

  constructor(private model: string, private instructions?: string | null) {}

  async generateText(request: AITextRequest): Promise<string> {
    const guidance = this.instructions ? `\nInstructions: ${this.instructions}` : "";
    return [
      `Mock AI provider (${this.model})`,
      request.system ? `System: ${request.system}` : "",
      `Prompt: ${request.prompt}`,
      guidance,
      "This local mock is deterministic and does not call an external model.",
    ]
      .filter(Boolean)
      .join("\n");
  }
}

class OpenAIProvider implements AIProvider {
  name: AIProviderName = "openai";

  constructor(private model: string) {}

  async generateText(request: AITextRequest): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 1800,
        messages: [
          { role: "system", content: request.system || "You are a truthful internship application assistant." },
          { role: "user", content: request.prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${await safeBody(response)}`);
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

class AnthropicProvider implements AIProvider {
  name: AIProviderName = "anthropic";

  constructor(private model: string) {}

  async generateText(request: AITextRequest): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 1800,
        temperature: request.temperature ?? 0.2,
        system: request.system || "You are a truthful internship application assistant.",
        messages: [{ role: "user", content: request.prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API error ${response.status}: ${await safeBody(response)}`);
    const data = (await response.json()) as { content?: { text?: string }[] };
    return data.content?.map((item) => item.text ?? "").join("") ?? "";
  }
}

async function safeBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "<no response body>";
  }
}
