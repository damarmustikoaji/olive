"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories.js";

export async function retryTaskRun(taskRunId: string): Promise<void> {
  await repositories.taskRuns.resetForRetry(taskRunId);
  revalidatePath("/runs");
}
