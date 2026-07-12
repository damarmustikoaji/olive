import Link from "next/link";
import { notFound } from "next/navigation";
import { repositories } from "@/lib/repositories";
import { approveTask, markTaskDone, rejectTask } from "@/lib/task-actions";

export async function TaskDetailContent({ taskId }: { taskId: string }) {
  const task = await repositories.tasks.findById(taskId);
  if (!task) notFound();

  const events = await repositories.taskEvents.listByTask(taskId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{task.title}</h1>
        {task.description && <p className="mt-1 text-sm text-neutral-400">{task.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded border border-neutral-800 p-4 text-sm">
        <Field label="Status" value={task.status} />
        <Field label="Severity" value={task.severity} />
        <Field label="Priority" value={task.priority} />
        <Field label="Source" value={task.source} />
        <Field label="Assigned to" value={task.assigneeAgent ?? "-"} />
        <Field label="Created by" value={task.createdBy} />
      </div>

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
        <ul className="space-y-2 border-l border-neutral-800 pl-4 text-sm">
          {events.map((event) => (
            <li key={event.id}>
              <span className="text-neutral-500">
                {event.createdAt.toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>{" "}
              — {event.event}
              {event.meta && Object.keys(event.meta).length > 0 && (
                <span className="text-neutral-500"> ({formatMeta(event.meta)})</span>
              )}
            </li>
          ))}
          {events.length === 0 && <li className="text-neutral-600">Belum ada aktivitas.</li>}
        </ul>
      </div>
    </div>
  );
}

function formatMeta(meta: Record<string, unknown>): string {
  return Object.entries(meta)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p>{value}</p>
    </div>
  );
}
