import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "../types.js";

export interface SeoOutput {
  seoTitle: string;
  seoDescription: string;
  hashtags: string[];
}

/**
 * The prompt for this skill instructs the model to reply with strict JSON
 * matching SeoOutput — parseOutput just decodes it.
 */
export class GenerateSeoSkill extends PromptDrivenSkill<ContentWriterInput, SeoOutput> {
  readonly name = "generate-seo";
  protected readonly agentName = AGENT_NAME;

  protected parseOutput(text: string): SeoOutput {
    const parsed = JSON.parse(text) as Partial<SeoOutput>;
    return {
      seoTitle: parsed.seoTitle ?? "",
      seoDescription: parsed.seoDescription ?? "",
      hashtags: parsed.hashtags ?? [],
    };
  }
}
