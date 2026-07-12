"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AgentFilter({ agents }: { agents: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("agent") ?? "";

  return (
    <select
      value={current}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        if (event.target.value) {
          params.set("agent", event.target.value);
        } else {
          params.delete("agent");
        }
        router.push(`/board${params.toString() ? `?${params.toString()}` : ""}`);
      }}
      className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100"
    >
      <option value="">Semua agent</option>
      {agents.map((agent) => (
        <option key={agent} value={agent}>
          {agent}
        </option>
      ))}
    </select>
  );
}
