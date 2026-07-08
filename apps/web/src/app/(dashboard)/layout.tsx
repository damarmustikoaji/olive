import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-auth.js";
import { logout } from "./actions.js";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="font-semibold">
            AI Workforce
          </Link>
          <Link href="/repositories" className="text-neutral-400 hover:text-neutral-100">
            Repositories
          </Link>
          <Link href="/content" className="text-neutral-400 hover:text-neutral-100">
            Content
          </Link>
          <Link href="/runs" className="text-neutral-400 hover:text-neutral-100">
            Runs
          </Link>
        </nav>
        <form action={logout}>
          <button type="submit" className="text-sm text-neutral-400 hover:text-neutral-100">
            {user.email} — Logout
          </button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
