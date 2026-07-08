import type { ExecutionContext } from "../context/index.js";
import type { Skill } from "./skill.interface.js";
import { renderTemplate } from "./render-template.js";

/**
 * Base for skills whose only job is: render a DB-stored prompt template with `input`,
 * call the AI provider, record the invocation, and parse the result.
 * Subclasses only implement `parseOutput` — everything else (prompt lookup, fallback
 * models, usage logging) is shared so adding a new platform skill is a few lines.
 */
export abstract class PromptDrivenSkill<TInput extends Record<string, unknown>, TOutput>
  implements Skill<TInput, TOutput>
{
  abstract readonly name: string;
  protected abstract readonly agentName: string;

  protected parseOutput(text: string): TOutput {
    return text as unknown as TOutput;
  }

  async execute(input: TInput, ctx: ExecutionContext): Promise<TOutput> {
    const promptVersion = await ctx.repositories.promptVersions.getActive(this.agentName, this.name);
    const userPrompt = renderTemplate(promptVersion.userPromptTpl, input);

    const result = await ctx.aiProvider.complete({
      systemPrompt: promptVersion.systemPrompt,
      userPrompt,
      primaryModel: promptVersion.model,
      fallbackModels: promptVersion.fallbackModels,
    });

    await ctx.repositories.aiInvocations.record({
      taskRunId: ctx.taskRunId,
      provider: promptVersion.provider,
      model: result.modelUsed,
      promptVersionId: promptVersion.id,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: result.usage.latencyMs,
      status: "success",
    });

    return this.parseOutput(result.text);
  }
}
