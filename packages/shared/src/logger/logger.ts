export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  taskRunId?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export type LogSink = (entry: LogEntry) => void;

/**
 * Structured logger. Always writes to stdout (visible in the GitHub Actions run log).
 * Additional sinks (e.g. persisting to task_run_logs) are attached by the caller —
 * the logger itself has no knowledge of the database.
 */
export class Logger {
  private readonly sinks: LogSink[];

  constructor(
    private readonly taskRunId?: string,
    sinks: LogSink[] = [],
  ) {
    this.sinks = [stdoutSink, ...sinks];
  }

  child(taskRunId: string): Logger {
    return new Logger(taskRunId, this.sinks.slice(1));
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.emit("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.emit("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.emit("error", message, meta);
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      taskRunId: this.taskRunId,
      meta,
      timestamp: new Date().toISOString(),
    };
    for (const sink of this.sinks) sink(entry);
  }
}

const stdoutSink: LogSink = (entry) => {
  const line = JSON.stringify(entry);
  if (entry.level === "error") console.error(line);
  else if (entry.level === "warn") console.warn(line);
  else console.log(line);
};

export function createLogger(sinks: LogSink[] = []): Logger {
  return new Logger(undefined, sinks);
}
