"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";

export async function changePassword(formData: FormData): Promise<void> {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    redirect("/account?error=" + encodeURIComponent("Password minimal 8 karakter"));
  }
  if (newPassword !== confirmPassword) {
    redirect("/account?error=" + encodeURIComponent("Konfirmasi password tidak cocok"));
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    redirect("/account?error=" + encodeURIComponent(error.message));
  }

  redirect("/account?success=1");
}
