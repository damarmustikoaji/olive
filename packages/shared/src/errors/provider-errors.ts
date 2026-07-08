import { PermanentError, TransientError } from "./base-error.js";

export class RateLimitError extends TransientError {
  constructor(public readonly model: string, options?: { cause?: unknown }) {
    super(`Rate limited on model "${model}"`, options);
  }
}

export class ModelUnavailableError extends TransientError {
  constructor(public readonly model: string, options?: { cause?: unknown }) {
    super(`Model "${model}" unavailable`, options);
  }
}

export class AllModelsExhaustedError extends PermanentError {
  constructor(public readonly candidates: string[]) {
    super(`All candidate models exhausted: ${candidates.join(", ")}`);
  }
}

/** Generic transient HTTP failure (5xx, timeout) for non-AI-provider integrations (e.g. GitHub API). */
export class TransientHttpError extends TransientError {
  constructor(public readonly source: string, options?: { cause?: unknown }) {
    super(`Transient HTTP error from "${source}"`, options);
  }
}
