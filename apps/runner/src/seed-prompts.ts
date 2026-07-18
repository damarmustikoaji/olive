import { loadConfig } from "@ai-workforce/shared";
import { createSupabaseClient } from "@ai-workforce/db";
import { AGENT_NAME, MARKETING_CONTENT_WRITER_PROMPT_SEED } from "@ai-workforce/agent-marketing-content-writer";
import {
  WORKFORCE_MANAGER_AGENT_NAME,
  WORKFORCE_MANAGER_PROMPT_SEED,
} from "@ai-workforce/workflow-workforce-manager";

/**
 * One-off seed: inserts prompt_templates + prompt_versions for every agent's
 * skills. Run manually (not part of the scheduled runner) whenever
 * onboarding a new environment, or after picking real model names.
 *
 * Free-tier model names on OpenRouter change over time — deliberately not
 * hardcoded here. Set SEED_MODEL before running, e.g.:
 *   SEED_MODEL="openai/gpt-oss-20b:free" pnpm --filter @ai-workforce/runner run seed:prompts
 *
 * The workforce-manager's "assign-task-decision" skill uses tool-calling
 * (completeWithTools) — SEED_MODEL must be a model that RELIABLY emits
 * structured tool_calls, not just one that advertises `tools` in its
 * supported_parameters. Verified in production: openai/gpt-oss-20b:free and
 * nvidia/nemotron-3-super-120b-a12b:free both work correctly.
 * meta-llama/llama-3.3-70b-instruct:free advertises tool support but in
 * practice hallucinates a pseudo-XML `<function=...>` string instead of a
 * real tool_calls response and fails — verify any new model choice with a
 * real completeWithTools() call before relying on it, not just its listed
 * capabilities.
 */
const SEED_GROUPS = [
  { agentName: AGENT_NAME, seeds: MARKETING_CONTENT_WRITER_PROMPT_SEED },
  { agentName: WORKFORCE_MANAGER_AGENT_NAME, seeds: WORKFORCE_MANAGER_PROMPT_SEED },
];

async function main(): Promise<void> {
  const config = loadConfig();
  const seedModel = process.env.SEED_MODEL;
  if (!seedModel) {
    throw new Error("SEED_MODEL env var is required — pick a currently-available model from openrouter.ai/models");
  }

  const client = createSupabaseClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

  for (const group of SEED_GROUPS) {
    for (const seed of group.seeds) {
      const { data: template, error: templateError } = await client
        .from("prompt_templates")
        .upsert(
          { agent_name: group.agentName, skill_name: seed.skillName, is_active: true },
          { onConflict: "agent_name,skill_name,is_active" },
        )
        .select()
        .single();

      if (templateError) throw templateError;

      const { error: versionError } = await client.from("prompt_versions").insert({
        prompt_template_id: template.id,
        version: 1,
        system_prompt: seed.systemPrompt,
        user_prompt_tpl: seed.userPromptTpl,
        provider: seed.provider,
        model: seedModel,
        fallback_models: seed.fallbackModels,
      });

      if (versionError) {
        if (versionError.code === "23505") {
          // version 1 already seeded for this skill in a prior run — this
          // script is meant to be safe to re-run when adding a new skill
          // without re-seeding (and clobbering the active version of)
          // ones that already exist.
          console.log(`skipped ${group.agentName}/${seed.skillName} — version 1 already seeded`);
          continue;
        }
        throw versionError;
      }

      console.log(`seeded prompt for ${group.agentName}/${seed.skillName}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
