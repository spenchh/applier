import { z } from "zod";
import { env, effectiveLlmProvider, type LlmProviderName } from "../env";
import { MockProvider } from "./mock";

export interface GenerateOptions {
  /** A label used by the mock provider to choose a canned response shape. */
  task?: string;
  temperature?: number;
  maxTokens?: number;
  /** Arbitrary structured context the mock provider can use. */
  context?: Record<string, unknown>;
}

export interface LlmProvider {
  readonly name: LlmProviderName;
  generateText(system: string, prompt: string, options?: GenerateOptions): Promise<string>;
  generateStructuredObject<T>(
    system: string,
    prompt: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options?: GenerateOptions,
  ): Promise<T>;
}

/** Extracts the first valid JSON object/array from a model's text response. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip code fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to locating the first balanced { ... } or [ ... ] block.
    const start = candidate.search(/[[{]/);
    if (start >= 0) {
      for (let end = candidate.length; end > start; end--) {
        try {
          return JSON.parse(candidate.slice(start, end));
        } catch {
          /* keep shrinking */
        }
      }
    }
    throw new Error("Could not parse JSON from model response");
  }
}

// ---- HTTP-based providers (no SDK dependency) -----------------------------

class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;

  async generateText(system: string, prompt: string, options?: GenerateOptions): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.anthropicModel,
        max_tokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.2,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic API error ${res.status}: ${await safeText(res)}`);
    }
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.map((c) => c.text ?? "").join("") ?? "";
  }

  async generateStructuredObject<T>(
    system: string,
    prompt: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options?: GenerateOptions,
  ): Promise<T> {
    const text = await this.generateText(
      system + "\n\nRespond with ONLY valid JSON, no prose, no code fences.",
      prompt,
      options,
    );
    return schema.parse(extractJson(text));
  }
}

class OpenAiProvider implements LlmProvider {
  readonly name = "openai" as const;

  async generateText(system: string, prompt: string, options?: GenerateOptions): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 2048,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI API error ${res.status}: ${await safeText(res)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }

  async generateStructuredObject<T>(
    system: string,
    prompt: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options?: GenerateOptions,
  ): Promise<T> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: options?.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system + "\n\nRespond with ONLY a valid JSON object." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`OpenAI API error ${res.status}: ${await safeText(res)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    return schema.parse(extractJson(text));
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "<no body>";
  }
}

/**
 * Resolve the active provider. Falls back to the mock provider whenever the
 * selected provider's API key is missing, so the app always works locally.
 */
export function getProvider(configured?: string): LlmProvider {
  const provider = effectiveLlmProvider(configured);
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAiProvider();
    default:
      return new MockProvider();
  }
}
