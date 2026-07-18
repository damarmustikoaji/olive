import type {
  AiProvider,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatCompletionWithToolsRequest,
  ChatCompletionWithToolsResult,
  ToolCall,
} from "@ai-workforce/core";
import { ModelUnavailableError, RateLimitError, withRetry } from "@ai-workforce/shared";

interface GroqToolCallResponse {
  choices: {
    message: {
      content: string | null;
      tool_calls?: { id: string; function: { name: string; arguments: string } }[];
    };
  }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export interface GroqProviderOptions {
  apiKey: string;
  /** Groq's model namespace is unrelated to OpenRouter's, so this is fixed
   * per-provider rather than driven by prompt_versions.model. */
  model?: string;
}

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/**
 * Emergency fallback only — used when OpenRouter itself is unreachable or
 * fully rate-limited (not just one model), so it deliberately ignores
 * request.primaryModel/fallbackModels (those are OpenRouter model IDs) and
 * always uses its own configured default instead.
 */
export class GroqProvider implements AiProvider {
  readonly name = "groq";
  private readonly model: string;

  constructor(private readonly options: GroqProviderOptions) {
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    return withRetry(() => this.callModel(request));
  }

  async completeWithTools(request: ChatCompletionWithToolsRequest): Promise<ChatCompletionWithToolsResult> {
    return withRetry(() => this.callModelWithTools(request));
  }

  private async callModelWithTools(
    request: ChatCompletionWithToolsRequest,
  ): Promise<ChatCompletionWithToolsResult> {
    const startedAt = Date.now();

    const messages: unknown[] = [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt },
    ];
    for (const msg of request.priorMessages ?? []) {
      if (msg.role === "assistant") {
        messages.push({
          role: "assistant",
          content: msg.content,
          tool_calls: msg.toolCalls?.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });
      } else {
        messages.push({ role: "tool", tool_call_id: msg.toolCallId, content: msg.content });
      }
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: request.tools.map((tool) => ({
          type: "function",
          function: { name: tool.name, description: tool.description, parameters: tool.parameters },
        })),
      }),
    });

    if (response.status === 429) throw new RateLimitError(this.model);
    if (response.status >= 500) throw new ModelUnavailableError(this.model);
    if (!response.ok) {
      throw new Error(`Groq request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as GroqToolCallResponse;
    const latencyMs = Date.now() - startedAt;
    const message = data.choices[0]?.message;
    const toolCalls: ToolCall[] =
      message?.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      })) ?? [];

    return {
      text: message?.content ?? "",
      toolCalls,
      modelUsed: this.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        latencyMs,
      },
    };
  }

  private async callModel(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const startedAt = Date.now();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
      }),
    });

    if (response.status === 429) throw new RateLimitError(this.model);
    if (response.status >= 500) throw new ModelUnavailableError(this.model);
    if (!response.ok) {
      throw new Error(`Groq request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const latencyMs = Date.now() - startedAt;

    return {
      text: data.choices[0]?.message.content ?? "",
      modelUsed: this.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        latencyMs,
      },
    };
  }
}
