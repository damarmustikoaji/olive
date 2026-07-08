import { ConfigError } from "../errors/index.js";
import { configSchema, type Config } from "./config.schema.js";

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new ConfigError(`missing/invalid environment variables:\n${issues}`);
  }

  return result.data;
}
