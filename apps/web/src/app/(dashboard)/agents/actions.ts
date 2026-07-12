"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories";

export async function updateAgentDescription(formData: FormData): Promise<void> {
  const agentName = String(formData.get("agentName"));
  const description = String(formData.get("description") ?? "");

  const existing = await repositories.agentProfiles.getByAgent(agentName);
  if (!existing) return;

  await repositories.agentProfiles.upsert({
    agentName,
    role: existing.role,
    level: existing.level,
    status: existing.status,
    description,
  });

  revalidatePath("/agents");
}
