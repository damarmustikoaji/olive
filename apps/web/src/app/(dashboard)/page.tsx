import Link from "next/link";
import { repositories } from "@/lib/repositories.js";

export default async function OverviewPage() {
  const [recentBatches, recentRuns] = await Promise.all([
    repositories.contentBatches.listRecent({ limit: 5 }),
    repositories.taskRuns.listRecent(5),
  ]);

  const failedRuns = recentRuns.filter((r) => r.status === "failed");

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Overview</h1>

      {failedRuns.length > 0 && (
        <div className="rounded border border-red-900 bg-red-950/40 p-4 text-sm">
          {failedRuns.length} task run gagal baru-baru ini —{" "}
          <Link href="/runs" className="underline">
            lihat detail
          </Link>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-400">Content batch terbaru</h2>
        <ul className="divide-y divide-neutral-800 rounded border border-neutral-800">
          {recentBatches.map((batch) => (
            <li key={batch.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <Link href={`/content/${batch.id}`} className="hover:underline">
                {batch.releaseTitle ?? batch.releaseTag}
              </Link>
              <span className="text-neutral-500">{batch.status}</span>
            </li>
          ))}
          {recentBatches.length === 0 && (
            <li className="px-4 py-3 text-sm text-neutral-500">Belum ada content batch.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
