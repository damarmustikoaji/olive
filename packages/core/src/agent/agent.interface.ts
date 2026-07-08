import type { ExecutionContext } from "../context/index.js";

/**
 * A "role" composed of one or more Skills. Knows WHICH skills to run for a given input
 * and how to persist their combined result, but not HOW each skill works internally.
 */
export interface Agent<TInput, TResult> {
  readonly name: string;
  run(input: TInput, ctx: ExecutionContext): Promise<TResult>;
}
