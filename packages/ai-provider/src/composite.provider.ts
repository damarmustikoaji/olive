import type {
  AiProvider,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatCompletionWithToolsRequest,
  ChatCompletionWithToolsResult,
} from "@ai-workforce/core";

/**
 * Tries each provider in order, moving to the next only if the current one
 * throws entirely (not just one exhausted model — OpenRouterProvider already
 * handles per-model fallback internally before giving up). This is the
 * "switch provider, not just model" layer: if OpenRouter itself is down or
 * fully rate-limited, a free provider with its own quota (e.g. Groq) picks
 * up the request instead of the task failing outright.
 */
export class CompositeAiProvider implements AiProvider {
  readonly name = "composite";

  constructor(private readonly providers: AiProvider[]) {
    if (providers.length === 0) throw new Error("CompositeAiProvider needs at least one provider");
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        return await provider.complete(request);
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    throw lastError;
  }

  /** Delegates to the first underlying provider that implements tool-calling. */
  async completeWithTools(request: ChatCompletionWithToolsRequest): Promise<ChatCompletionWithToolsResult> {
    let lastError: unknown;

    for (const provider of this.providers) {
      if (!provider.completeWithTools) continue;
      try {
        return await provider.completeWithTools(request);
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    throw lastError ?? new Error("no configured AiProvider supports completeWithTools");
  }
}
