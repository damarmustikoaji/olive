"use server";

import { revalidatePath } from "next/cache";
import { repositories } from "@/lib/repositories.js";

export async function addWatchedRepository(formData: FormData): Promise<void> {
  const owner = String(formData.get("owner") ?? "").trim();
  const repo = String(formData.get("repo") ?? "").trim();

  if (!owner || !repo) return;

  await repositories.watchedRepositories.create({ owner, repo, isActive: true });
  revalidatePath("/repositories");
}

export async function toggleActive(id: string, isActive: boolean): Promise<void> {
  await repositories.watchedRepositories.setActive(id, isActive);
  revalidatePath("/repositories");
}
