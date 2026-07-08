import type { Config } from "./config.schema.js";

/**
 * Cron granularity/delay is unreliable, so the working-hours gate lives in code,
 * not in the cron expression. GitHub Actions only decides "try now"; this decides "allowed now".
 */
export function isWithinWorkingHours(now: Date, config: Config): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: config.WORK_TIMEZONE,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  const isWeekday = !["Sat", "Sun"].includes(weekday);
  if (!isWeekday) return false;

  const [startH = 0, startM = 0] = config.WORK_HOURS_START.split(":").map(Number);
  const [endH = 0, endM = 0] = config.WORK_HOURS_END.split(":").map(Number);

  const nowMinutes = hour * 60 + minute;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}
