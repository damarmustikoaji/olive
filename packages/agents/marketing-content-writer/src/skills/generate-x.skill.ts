import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "../types.js";

export class GenerateXSkill extends PromptDrivenSkill<ContentWriterInput, string> {
  readonly name = "generate-x";
  protected readonly agentName = AGENT_NAME;
}
