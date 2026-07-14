import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME } from "../types.js";

export interface SummarizeResearchInput extends Record<string, unknown> {
  searchResultsText: string;
  repoContextText: string;
}

export class SummarizeResearchSkill extends PromptDrivenSkill<SummarizeResearchInput, string> {
  readonly name = "summarize-research";
  protected readonly agentName = AGENT_NAME;
}
