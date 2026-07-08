"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth.js";

export async function logout(): Promise<void> {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
