import type { ExecutionContext } from "../context/index.js";

/**
 * Smallest reusable unit of work. A Skill knows how to produce ONE output from ONE input
 * using the AI provider (or not). It never persists domain entities itself — that's the Agent's job.
 */
export interface Skill<TInput, TOutput> {
  readonly name: string;
  execute(input: TInput, ctx: ExecutionContext): Promise<TOutput>;
}
