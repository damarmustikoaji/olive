"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";

export async function setAgentTarget(formData: FormData): Promise<void> {
  const agentName = String(formData.get("agentName"));
  const metric = String(formData.get("metric"));
  const targetValue = Number(formData.get("targetValue"));

  if (!agentName || !metric || !Number.isFinite(targetValue) || targetValue < 0) return;

  await repositories.agentTargets.upsert(agentName, metric, targetValue);
  revalidatePath("/agents");
}
