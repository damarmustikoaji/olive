import type { SupabaseClient } from "../supabase-client.js";
import type { AiInvocationRecord, AiInvocationRepo as IAiInvocationRepo } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

export class AiInvocationRepo implements IAiInvocationRepo {
  constructor(private readonly client: SupabaseClient) {}

  async record(entry: AiInvocationRecord): Promise<void> {
    const { error } = await this.client.from("ai_invocations").insert({
      task_run_id: entry.taskRunId,
      provider: entry.provider,
      model: entry.model,
      prompt_version_id: entry.promptVersionId,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      latency_ms: entry.latencyMs,
      status: entry.status,
      error_message: entry.errorMessage ?? null,
    });

    if (error) throw new DatabaseError("record ai_invocation failed", error);
  }
}
