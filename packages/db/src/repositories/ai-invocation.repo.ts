import type { SupabaseClient } from "../supabase-client.js";
import type {
  AgentUsageSummary,
  AiInvocationRecord,
  AiInvocationRepo as IAiInvocationRepo,
} from "@ai-workforce/core";
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

  async sumUsageByAgent(agentName: string, sinceDate?: Date): Promise<AgentUsageSummary> {
    // No DB view for this join yet — two small queries (prompt_versions this
    // agent owns, then invocations against those) rather than a Postgres
    // function, since the data volume here is tiny at this stage.
    const { data: templates, error: templateError } = await this.client
      .from("prompt_templates")
      .select("id")
      .eq("agent_name", agentName);

    if (templateError) throw new DatabaseError("sumUsageByAgent prompt_templates failed", templateError);
    if (!templates || templates.length === 0) {
      return { invocationCount: 0, inputTokens: 0, outputTokens: 0 };
    }

    const { data: versions, error: versionError } = await this.client
      .from("prompt_versions")
      .select("id")
      .in(
        "prompt_template_id",
        templates.map((t) => t.id),
      );

    if (versionError) throw new DatabaseError("sumUsageByAgent prompt_versions failed", versionError);
    if (!versions || versions.length === 0) {
      return { invocationCount: 0, inputTokens: 0, outputTokens: 0 };
    }

    let query = this.client
      .from("ai_invocations")
      .select("input_tokens, output_tokens")
      .in(
        "prompt_version_id",
        versions.map((v) => v.id),
      );

    if (sinceDate) query = query.gte("created_at", sinceDate.toISOString());

    const { data: invocations, error: invocationError } = await query;
    if (invocationError) throw new DatabaseError("sumUsageByAgent ai_invocations failed", invocationError);

    const rows = (invocations ?? []) as { input_tokens: number | null; output_tokens: number | null }[];
    return {
      invocationCount: rows.length,
      inputTokens: rows.reduce((sum, r) => sum + (r.input_tokens ?? 0), 0),
      outputTokens: rows.reduce((sum, r) => sum + (r.output_tokens ?? 0), 0),
    };
  }
}
