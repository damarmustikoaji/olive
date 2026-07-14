import { PromptDrivenSkill } from "@ai-workforce/core";

export interface AnalyzeImageInput extends Record<string, unknown> {
  imageUrl: string;
  context: string;
}

/**
 * Runs automatically for a manual task that has an image attached (see
 * WorkforceManagerWorkflow.executeImageAnalysis), and is also available as
 * an on-demand "Analisa Gambar (AI)" button in the dashboard for re-running
 * on images added after the fact. Free vision-capable models on OpenRouter
 * have tighter rate limits than the text models the rest of the system
 * uses, which is why this stays scoped to "only when there's actually an
 * image", not a general-purpose vision call.
 */
export class AnalyzeImageSkill extends PromptDrivenSkill<AnalyzeImageInput, string> {
  readonly name = "analyze-image";
  protected readonly agentName = "workforce-manager";
}
