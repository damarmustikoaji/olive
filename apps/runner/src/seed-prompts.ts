import { loadConfig } from "@ai-workforce/shared";
import { createSupabaseClient } from "@ai-workforce/db";
import { AGENT_NAME, MARKETING_CONTENT_WRITER_PROMPT_SEED } from "@ai-workforce/agent-marketing-content-writer";

/**
 * One-off seed: inserts prompt_templates + prompt_versions for the Marketing
 * Content Writer skills. Run manually (not part of the scheduled runner) whenever
 * onboarding a new environment, or after picking real model names.
 *
 * Free-tier model names on OpenRouter change over time — deliberately not
 * hardcoded here. Set SEED_MODEL before running, e.g.:
 *   SEED_MODEL="meta-llama/llama-3.3-70b-instruct:free" pnpm --filter @ai-workforce/runner run seed:prompts
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const seedModel = process.env.SEED_MODEL;
  if (!seedModel) {
    throw new Error("SEED_MODEL env var is required — pick a currently-available model from openrouter.ai/models");
  }

  const client = createSupabaseClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

  for (const seed of MARKETING_CONTENT_WRITER_PROMPT_SEED) {
    const { data: template, error: templateError } = await client
      .from("prompt_templates")
      .upsert(
        { agent_name: AGENT_NAME, skill_name: seed.skillName, is_active: true },
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

    if (versionError) throw versionError;

    console.log(`seeded prompt for skill "${seed.skillName}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
