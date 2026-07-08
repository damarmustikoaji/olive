import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "../types.js";

export class GenerateFacebookSkill extends PromptDrivenSkill<ContentWriterInput, string> {
  readonly name = "generate-facebook";
  protected readonly agentName = AGENT_NAME;
}
