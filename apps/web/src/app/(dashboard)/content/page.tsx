import Link from "next/link";
import { repositories } from "@/lib/repositories.js";

export default async function ContentListPage() {
  const batches = await repositories.contentBatches.listRecent({ limit: 50 });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Content Batches</h1>

      <ul className="divide-y divide-neutral-800 rounded border border-neutral-800">
        {batches.map((batch) => (
          <li key={batch.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <Link href={`/content/${batch.id}`} className="hover:underline">
              {batch.releaseTitle ?? batch.releaseTag}
            </Link>
            <span className="text-neutral-500">{batch.status}</span>
          </li>
        ))}
        {batches.length === 0 && (
          <li className="px-4 py-3 text-sm text-neutral-500">Belum ada content batch.</li>
        )}
      </ul>
    </div>
  );
}
