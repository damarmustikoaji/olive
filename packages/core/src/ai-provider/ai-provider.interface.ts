export interface ChatCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Preferred model for this call. */
  primaryModel: string;
  /** Tried in order if primaryModel is rate-limited/unavailable. */
  fallbackModels?: string[];
  /** Vision input — only OpenRouterProvider honors this; primaryModel must be a vision-capable model. */
  imageUrl?: string;
}

export interface ChatCompletionUsage {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface ChatCompletionResult {
  text: string;
  /** The model that actually served the request (may differ from primaryModel after fallback). */
  modelUsed: string;
  usage: ChatCompletionUsage;
}

/**
 * Port for any LLM provider (OpenRouter, direct Google AI Studio, Groq, ...).
 * Agents/Skills only ever depend on this interface, never on a concrete provider.
 */
export interface AiProvider {
  readonly name: string;
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
}
