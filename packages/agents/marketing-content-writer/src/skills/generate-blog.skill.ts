import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "../types.js";

export class GenerateBlogSkill extends PromptDrivenSkill<ContentWriterInput, string> {
  readonly name = "generate-blog";
  protected readonly agentName = AGENT_NAME;
}
