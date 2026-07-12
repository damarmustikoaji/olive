import { PromptDrivenSkill } from "@ai-workforce/core";

export interface AnalyzeImageInput extends Record<string, unknown> {
  imageUrl: string;
  context: string;
}

/**
 * Opt-in only — the Owner clicks a button to run this, it never runs
 * automatically on a manual task. Free vision-capable models on OpenRouter
 * have tighter rate limits than the text models the rest of the system
 * uses, so this stays a manual, on-demand action rather than part of any
 * scheduled workflow.
 */
export class AnalyzeImageSkill extends PromptDrivenSkill<AnalyzeImageInput, string> {
  readonly name = "analyze-image";
  protected readonly agentName = "workforce-manager";
}
