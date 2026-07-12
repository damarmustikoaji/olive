import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME, type ContentWriterInput } from "../types.js";

export class GenerateThreadsSkill extends PromptDrivenSkill<ContentWriterInput, string> {
  readonly name = "generate-threads";
  protected readonly agentName = AGENT_NAME;
}
