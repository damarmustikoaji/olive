import type { Workflow } from "./workflow.interface.js";

/**
 * Explicit, static registration — deliberately not auto-discovery.
 * Adding a new agent/workflow means one new line in apps/runner/src/register-workflows.ts,
 * never a change here or in the runner loop.
 */
export class WorkflowRegistry {
  private static workflows: Workflow[] = [];

  static register(workflow: Workflow): void {
    this.workflows.push(workflow);
  }

  static all(): Workflow[] {
    return this.workflows;
  }

  static reset(): void {
    this.workflows = [];
  }
}
