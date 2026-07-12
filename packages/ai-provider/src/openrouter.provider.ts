import type { AiProvider, ChatCompletionRequest, ChatCompletionResult } from "@ai-workforce/core";
import { AllModelsExhaustedError, ModelUnavailableError, RateLimitError, withRetry } from "@ai-workforce/shared";

export interface OpenRouterProviderOptions {
  apiKey: string;
  baseUrl?: string;
}

interface OpenRouterChatResponse {
  choices: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

/**
 * The only place that knows OpenRouter's HTTP shape. Agents/Skills never call this directly —
 * they go through the AiProvider interface from @ai-workforce/core.
 */
export class OpenRouterProvider implements AiProvider {
  readonly name = "openrouter";
  private readonly baseUrl: string;

  constructor(private readonly options: OpenRouterProviderOptions) {
    this.baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1";
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const candidates = [request.primaryModel, ...(request.fallbackModels ?? [])];

    for (const model of candidates) {
      try {
        return await withRetry(() => this.callModel(model, request));
      } catch (err) {
        if (err instanceof RateLimitError || err instanceof ModelUnavailableError) {
          continue; // try the next candidate model
        }
        throw err; // non-transient (e.g. bad prompt) — no point trying other models
      }
    }

    throw new AllModelsExhaustedError(candidates);
  }

  private async callModel(model: string, request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const startedAt = Date.now();

    const userContent = request.imageUrl
      ? [
          { type: "text", text: request.userPrompt },
          { type: "image_url", image_url: { url: request.imageUrl } },
        ]
      : request.userPrompt;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (response.status === 429) {
      throw new RateLimitError(model);
    }
    if (response.status >= 500) {
      throw new ModelUnavailableError(model);
    }
    if (!response.ok) {
      throw new Error(`OpenRouter request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as OpenRouterChatResponse;
    const latencyMs = Date.now() - startedAt;

    return {
      text: data.choices[0]?.message.content ?? "",
      modelUsed: model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        latencyMs,
      },
    };
  }
}
