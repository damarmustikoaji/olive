import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "../types.js";

export class GenerateNewsletterSkill extends PromptDrivenSkill<ContentWriterInput, string> {
  readonly name = "generate-newsletter";
  protected readonly agentName = AGENT_NAME;
}
