import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "../types.js";

export class GenerateInstagramSkill extends PromptDrivenSkill<ContentWriterInput, string> {
  readonly name = "generate-instagram";
  protected readonly agentName = AGENT_NAME;
}
