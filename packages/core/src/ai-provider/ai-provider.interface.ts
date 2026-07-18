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

// ============================================================
// Tool-calling — additive to the plain-text completion API above.
// `complete()`/`ChatCompletionRequest`/`ChatCompletionResult` are untouched
// so every existing call site keeps working unmodified. Only providers/
// workflows that opt into agent-driven decisions (e.g. WorkforceManager)
// use these.
// ============================================================

export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, { type: string; description: string; enum?: string[] }>;
  required: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Already JSON.parse'd from the provider's raw arguments string. */
  arguments: Record<string, unknown>;
}

/** One prior turn in an in-progress tool-calling loop. */
export type ToolLoopMessage =
  | { role: "assistant"; content: string | null; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export interface ChatCompletionWithToolsRequest extends ChatCompletionRequest {
  tools: ToolDefinition[];
  /** Prior turns in this tool-calling loop — empty/omitted on the first call. */
  priorMessages?: ToolLoopMessage[];
}

export interface ChatCompletionWithToolsResult extends ChatCompletionResult {
  /** Empty array means the model produced a final text answer, not another tool call. */
  toolCalls: ToolCall[];
}

/**
 * Port for any LLM provider (OpenRouter, direct Google AI Studio, Groq, ...).
 * Agents/Skills only ever depend on this interface, never on a concrete provider.
 */
export interface AiProvider {
  readonly name: string;
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
  /** Optional — providers without function-calling support simply omit this. */
  completeWithTools?(request: ChatCompletionWithToolsRequest): Promise<ChatCompletionWithToolsResult>;
}
