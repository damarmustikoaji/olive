"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Backdrop + dialog shell for intercepted routes. Closing always calls
 * router.back() so the URL correctly reverts to wherever the modal was
 * opened from (the board), rather than hardcoding a redirect target.
 */
export function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.back();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => router.back()}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-neutral-800 bg-neutral-950 p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={() => router.back()}
          className="float-right text-neutral-500 hover:text-neutral-200"
          aria-label="Close"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
