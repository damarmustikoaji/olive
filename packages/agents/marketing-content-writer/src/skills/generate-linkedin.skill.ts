import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "../types.js";

export class GenerateLinkedinSkill extends PromptDrivenSkill<ContentWriterInput, string> {
  readonly name = "generate-linkedin";
  protected readonly agentName = AGENT_NAME;
}
