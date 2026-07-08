import type { ExecutionContext } from "../context/index.js";

export interface WorkUnit {
  /** Idempotency key — combined with workflow name, enforced unique at the DB level. */
  triggerRef: string;
  payload: unknown;
}

/**
 * The only layer that knows WHEN and WHETHER to act. Turns external state
 * (a new release, a schedule) into concrete WorkUnits, then executes each one.
 */
export interface Workflow {
  readonly name: string;
  shouldRun(ctx: ExecutionContext): Promise<WorkUnit[]>;
  execute(unit: WorkUnit, ctx: ExecutionContext): Promise<void>;
}
