import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME } from "../types.js";

export interface SummarizeRecommendationInput extends Record<string, unknown> {
  performanceDataText: string;
}

/**
 * The one AI call this agent makes — once a day, only when there's enough
 * comparative data (2+ pieces with metrics) to say something concrete.
 * Everything else in Insight Agent is pure data collection with no model
 * call at all.
 */
export class SummarizeRecommendationSkill extends PromptDrivenSkill<SummarizeRecommendationInput, string> {
  readonly name = "summarize-recommendation";
  protected readonly agentName = AGENT_NAME;
}
