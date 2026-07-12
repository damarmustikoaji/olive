import { PromptDrivenSkill } from "@ai-workforce/core";
import type { TaskSeverity } from "@ai-workforce/core";

export interface ClassifySeverityInput extends Record<string, unknown> {
  releaseTitle: string;
  releaseBody: string;
}

export interface SeverityClassification {
  severity: TaskSeverity;
  reasoning: string;
}

const VALID_SEVERITIES: TaskSeverity[] = ["minor", "medium", "critical"];

/**
 * The Manager's triage step: is this release safe to auto-publish, or does
 * it need the Owner's judgment? Ambiguous or unparseable output defaults to
 * "critical" — the same instinct as a manager who isn't sure escalating
 * rather than guessing.
 */
export class ClassifySeverityTaskSkill extends PromptDrivenSkill<ClassifySeverityInput, SeverityClassification> {
  readonly name = "classify-severity";
  protected readonly agentName = "workforce-manager";

  protected parseOutput(text: string): SeverityClassification {
    try {
      const parsed = JSON.parse(text) as Partial<SeverityClassification>;
      if (parsed.severity && VALID_SEVERITIES.includes(parsed.severity)) {
        return { severity: parsed.severity, reasoning: parsed.reasoning ?? "" };
      }
    } catch {
      // fall through to safe default
    }
    return { severity: "critical", reasoning: "classification failed to parse — defaulting to critical" };
  }
}
