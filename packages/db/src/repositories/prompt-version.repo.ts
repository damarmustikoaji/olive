import type { SupabaseClient } from "../supabase-client.js";
import type { PromptVersion, PromptVersionRepo as IPromptVersionRepo } from "@ai-workforce/core";
import { DatabaseError } from "../database-error.js";

interface Row {
  id: string;
  prompt_template_id: string;
  version: number;
  system_prompt: string;
  user_prompt_tpl: string;
  provider: string;
  model: string;
  fallback_models: string[];
  created_at: string;
}

function toDomain(row: Row): PromptVersion {
  return {
    id: row.id,
    promptTemplateId: row.prompt_template_id,
    version: row.version,
    systemPrompt: row.system_prompt,
    userPromptTpl: row.user_prompt_tpl,
    provider: row.provider,
    model: row.model,
    fallbackModels: row.fallback_models ?? [],
    createdAt: new Date(row.created_at),
  };
}

export class PromptVersionRepo implements IPromptVersionRepo {
  constructor(private readonly client: SupabaseClient) {}

  async getActive(agentName: string, skillName: string): Promise<PromptVersion> {
    const { data: template, error: templateError } = await this.client
      .from("prompt_templates")
      .select("id")
      .eq("agent_name", agentName)
      .eq("skill_name", skillName)
      .eq("is_active", true)
      .maybeSingle();

    if (templateError) throw new DatabaseError("getActive prompt_template failed", templateError);
    if (!template) {
      throw new DatabaseError(
        `no active prompt_template for agent="${agentName}" skill="${skillName}"`,
        null,
      );
    }

    const { data: version, error: versionError } = await this.client
      .from("prompt_versions")
      .select("*")
      .eq("prompt_template_id", template.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) throw new DatabaseError("getActive prompt_version failed", versionError);
    if (!version) {
      throw new DatabaseError(`no prompt_version found for template ${template.id}`, null);
    }

    return toDomain(version as Row);
  }
}
