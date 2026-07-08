export abstract class BaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/**
 * Errors that are safe to retry (network blips, provider rate limits, timeouts).
 * Retried inside a single execution, close to where the call happens.
 */
export abstract class TransientError extends BaseError {}

/**
 * Errors that will not resolve by retrying (bad input, logic bugs, 4xx other than 429).
 * Surfaces immediately as a failed task_run, no in-process retry.
 */
export abstract class PermanentError extends BaseError {}
