import { PermanentError } from "./base-error.js";

export class ConfigError extends PermanentError {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`);
  }
}
