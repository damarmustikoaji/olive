import { PromptDrivenSkill } from "@ai-workforce/core";
import { AGENT_NAME } from "../types.js";

export interface IdentifyRelevantFilesInput extends Record<string, unknown> {
  title: string;
  description: string;
  fileList: string;
}

/**
 * Step 1 of 2: given a bug report and a repo's file listing (paths only, no
 * content — keeps the prompt small), guess which ~5 files are most likely
 * relevant. Step 2 (AnalyzeBugSkill) then reads only those files' actual
 * content, instead of feeding the whole repo to the model.
 */
export class IdentifyRelevantFilesSkill extends PromptDrivenSkill<IdentifyRelevantFilesInput, string[]> {
  readonly name = "identify-relevant-files";
  protected readonly agentName = AGENT_NAME;

  protected parseOutput(text: string): string[] {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((p): p is string => typeof p === "string").slice(0, 5);
    } catch {
      // fall through
    }
    return [];
  }
}
