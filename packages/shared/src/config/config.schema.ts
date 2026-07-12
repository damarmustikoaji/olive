import { z } from "zod";

export const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_DEFAULT_MODEL: z.string().min(1),

  GH_TOKEN: z.string().min(1),

  // Optional: only needed for the Manager's auto-publish-on-approval path.
  // Left unset, non-critical tasks still auto-approve but skip publishing.
  THREADS_USER_ID: z.string().optional(),
  THREADS_ACCESS_TOKEN: z.string().optional(),

  MAX_TASK_ATTEMPTS: z.coerce.number().int().positive().default(3),
  WORK_HOURS_START: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  WORK_HOURS_END: z.string().regex(/^\d{2}:\d{2}$/).default("17:00"),
  WORK_TIMEZONE: z.string().default("Asia/Jakarta"),
});

export type Config = z.infer<typeof configSchema>;
