"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Highlights itself when the current route matches, so the header always shows which page is active. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={
        isActive
          ? "rounded px-2 py-1 font-medium text-neutral-100 bg-neutral-800"
          : "rounded px-2 py-1 text-neutral-400 hover:text-neutral-100"
      }
    >
      {children}
    </Link>
  );
}
