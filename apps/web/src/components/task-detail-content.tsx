import Link from "next/link";
import { notFound } from "next/navigation";
import { repositories } from "@/lib/repositories";
import { analyzeTaskImage, approveTask, markTaskDone, rejectTask } from "@/lib/task-actions";
import { extractImageUrl } from "@/lib/task-image";
import { MarkdownContent } from "./markdown-content";

export async function TaskDetailContent({ taskId }: { taskId: string }) {
  const task = await repositories.tasks.findById(taskId);
  if (!task) notFound();

  const events = await repositories.taskEvents.listByTask(taskId);
  const hasImage = !!extractImageUrl(task.description);
  const alreadyAnalyzed = events.some((e) => e.event === "image_analyzed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{task.title}</h1>
        {task.description && (
          <div className="mt-2 text-neutral-400">
            <MarkdownContent text={task.description} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded border border-neutral-800 p-4 text-sm">
        <Field label="Status" value={task.status} />
        <Field label="Severity" value={task.severity} />
        <Field label="Priority" value={task.priority} />
        <Field label="Source" value={task.source} />
        <Field label="Assigned to" value={task.assigneeAgent ?? "-"} />
        <Field label="Created by" value={task.createdBy} />
      </div>

      {hasImage && !alreadyAnalyzed && (
        <form action={analyzeTaskImage.bind(null, task.id)}>
          <button
            type="submit"
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900"
          >
            🔍 Analisa Gambar (AI)
          </button>
        </form>
      )}

      {task.contentBatchId && (
        <Link
          href={`/content/${task.contentBatchId}`}
          className="inline-block rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900"
        >
          Lihat Content Batch →
        </Link>
      )}

      {task.status === "ready_for_review" && (
        <div className="flex gap-2">
          <form action={approveTask.bind(null, task.id)}>
            <button
              type="submit"
              className="rounded bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"
            >
              Approve
            </button>
          </form>
          <form action={rejectTask.bind(null, task.id)}>
            <button
              type="submit"
              className="rounded border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-950"
            >
              Reject
            </button>
          </form>
        </div>
      )}

      {task.status === "approved" && (
        <form action={markTaskDone.bind(null, task.id)}>
          <button
            type="submit"
            className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Mark Done
          </button>
        </form>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-400">Timeline</h2>
        <ul className="space-y-3 border-l border-neutral-800 pl-4 text-sm">
          {events.map((event) => {
            const { inline, long } = event.meta ? splitMeta(event.meta) : { inline: [], long: [] };
            return (
              <li key={event.id}>
                <span className="text-neutral-500">
                  {event.createdAt.toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>{" "}
                — {event.event}
                {inline.length > 0 && (
                  <span className="text-neutral-500"> ({inline.map(([k, v]) => `${k}: ${v}`).join(", ")})</span>
                )}
                {long.map(([key, value]) => (
                  <div key={key} className="mt-1 rounded border border-neutral-800 bg-neutral-900/50 p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">{key}</p>
                    <MarkdownContent text={String(value)} />
                  </div>
                ))}
              </li>
            );
          })}
          {events.length === 0 && <li className="text-neutral-600">Belum ada aktivitas.</li>}
        </ul>
      </div>
    </div>
  );
}

/** Fields over ~120 chars render as their own markdown block instead of being squashed into one inline line. */
const LONG_META_THRESHOLD = 120;

function splitMeta(meta: Record<string, unknown>): {
  inline: [string, unknown][];
  long: [string, unknown][];
} {
  const inline: [string, unknown][] = [];
  const long: [string, unknown][] = [];

  for (const entry of Object.entries(meta)) {
    const [, value] = entry;
    if (typeof value === "string" && value.length > LONG_META_THRESHOLD) {
      long.push(entry);
    } else if (Array.isArray(value)) {
      inline.push([entry[0], value.join(", ")]);
    } else {
      inline.push(entry);
    }
  }

  return { inline, long };
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p>{value}</p>
    </div>
  );
}
