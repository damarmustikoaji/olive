import { PermanentError } from "@ai-workforce/shared";

/**
 * Defaults to permanent (no automatic retry) — a DB write failure is usually a
 * logic/schema bug, not a transient blip. Callers that know better (e.g. pool
 * exhaustion under load) can catch and reclassify explicitly.
 */
export class DatabaseError extends PermanentError {
  constructor(message: string, public readonly cause: unknown) {
    super(message);
  }
}
