import { TransientError } from "../errors/index.js";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

/**
 * In-process retry for transient errors only (network blips, provider timeouts).
 * Permanent errors are rethrown immediately — no point retrying a bad prompt.
 * This is the "lapis 1" retry; the "lapis 2" retry (across separate GitHub Actions runs)
 * is handled by task_runs.attempt_count, not this function.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500 } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!(err instanceof TransientError) || attempt === maxAttempts) {
        throw err;
      }
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
