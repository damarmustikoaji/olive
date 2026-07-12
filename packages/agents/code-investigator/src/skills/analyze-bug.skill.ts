import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME } from "../types.js";

export interface AnalyzeBugInput extends Record<string, unknown> {
  title: string;
  description: string;
  fileContents: string;
}

/**
 * Step 2 of 2: read-only analysis only — this never writes code, opens a
 * branch, or creates a PR. Output is a written report (probable root cause,
 * relevant files, suggested approach) for the Owner or a future Developer
 * agent to act on.
 */
export class AnalyzeBugSkill extends PromptDrivenSkill<AnalyzeBugInput, string> {
  readonly name = "analyze-bug";
  protected readonly agentName = AGENT_NAME;
}
