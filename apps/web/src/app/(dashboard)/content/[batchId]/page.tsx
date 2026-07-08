import { notFound } from "next/navigation";
import { repositories } from "@/lib/repositories.js";
import { approvePiece, regeneratePiece } from "./actions.js";
import type { ContentPlatform } from "@ai-workforce/core";

const PLATFORM_LABEL: Record<ContentPlatform, string> = {
  blog: "Blog",
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  newsletter: "Newsletter",
  seo: "SEO",
};

export default async function ContentBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;

  const batch = await repositories.contentBatches.findById(batchId);
  if (!batch) notFound();

  const pieces = await repositories.contentPieces.listByBatch(batchId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{batch.releaseTitle ?? batch.releaseTag}</h1>
        <p className="text-sm text-neutral-500">
          {batch.releaseTag} — status: {batch.status}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {pieces.map((piece) => (
          <div key={piece.id} className="space-y-2 rounded border border-neutral-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{PLATFORM_LABEL[piece.platform]}</h2>
              {piece.reviewedAt && <span className="text-xs text-green-400">Approved</span>}
            </div>

            <form action={approvePiece} className="space-y-2">
              <input type="hidden" name="pieceId" value={piece.id} />
              <input type="hidden" name="batchId" value={batchId} />
              <textarea
                name="content"
                defaultValue={piece.content}
                rows={6}
                className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
              />
              {piece.platform === "seo" && (
                <div className="text-xs text-neutral-500">
                  <p>Description: {piece.seoDescription}</p>
                  <p>Hashtags: {piece.hashtags.join(" ")}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
                >
                  Approve
                </button>
              </div>
            </form>

            <form action={regeneratePiece.bind(null, batchId, piece.platform)}>
              <button
                type="submit"
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Regenerate
              </button>
            </form>
          </div>
        ))}
        {pieces.length === 0 && (
          <p className="text-sm text-neutral-500">Belum ada content piece untuk batch ini.</p>
        )}
      </div>
    </div>
  );
}
