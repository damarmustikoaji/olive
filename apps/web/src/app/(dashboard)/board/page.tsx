import Link from "next/link";
import { repositories } from "@/lib/repositories";
import { createManualTask } from "./actions";
import type { Task, TaskStatus } from "@ai-workforce/core";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "assigned", label: "Assigned" },
  { status: "in_progress", label: "In Progress" },
  { status: "ready_for_review", label: "Ready for Review" },
  { status: "approved", label: "Approved" },
  { status: "done", label: "Done" },
];

const SEVERITY_COLOR: Record<string, string> = {
  minor: "bg-neutral-700 text-neutral-200",
  medium: "bg-yellow-900 text-yellow-300",
  critical: "bg-red-900 text-red-300",
};

export default async function BoardPage() {
  const tasks = await repositories.tasks.listAll(200);

  const byStatus = new Map<TaskStatus, Task[]>();
  for (const task of tasks) {
    const list = byStatus.get(task.status) ?? [];
    list.push(task);
    byStatus.set(task.status, list);
  }

  const failedOrRejected = tasks.filter((t) => t.status === "rejected" || t.status === "failed");

  const workforceCounts = {
    working: (byStatus.get("in_progress")?.length ?? 0) + (byStatus.get("assigned")?.length ?? 0),
    waiting: byStatus.get("ready_for_review")?.length ?? 0,
    failed: failedOrRejected.length,
    done: byStatus.get("done")?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Board</h1>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatWidget label="Working" value={workforceCounts.working} color="text-blue-400" />
        <StatWidget label="Waiting Approval" value={workforceCounts.waiting} color="text-yellow-400" />
        <StatWidget label="Failed/Rejected" value={workforceCounts.failed} color="text-red-400" />
        <StatWidget label="Done" value={workforceCounts.done} color="text-green-400" />
      </div>

      <details className="rounded border border-neutral-800 p-4">
        <summary className="cursor-pointer text-sm font-medium">+ Buat Task Baru</summary>
        <form action={createManualTask} className="mt-4 space-y-3">
          <input
            name="title"
            placeholder="Judul task"
            required
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            placeholder="Deskripsi (opsional)"
            rows={3}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <select
              name="severity"
              defaultValue="medium"
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="minor">Minor</option>
              <option value="medium">Medium</option>
              <option value="critical">Critical</option>
            </select>
            <select
              name="priority"
              defaultValue="medium"
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Buat Task
          </button>
        </form>
      </details>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((col) => (
          <div key={col.status} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {col.label} ({byStatus.get(col.status)?.length ?? 0})
            </h2>
            <div className="space-y-2">
              {(byStatus.get(col.status) ?? []).map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block rounded border border-neutral-800 p-3 text-sm hover:border-neutral-600"
                >
                  <p className="font-medium">{task.title}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 ${SEVERITY_COLOR[task.severity]}`}>
                      {task.severity}
                    </span>
                    <span className="text-neutral-500">{task.assigneeAgent ?? "unassigned"}</span>
                  </div>
                </Link>
              ))}
              {(byStatus.get(col.status) ?? []).length === 0 && (
                <p className="text-xs text-neutral-600">Kosong</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {failedOrRejected.length > 0 && (
        <div className="rounded border border-red-900 bg-red-950/30 p-4">
          <h2 className="mb-2 text-sm font-medium text-red-300">Rejected / Failed</h2>
          <ul className="space-y-1 text-sm">
            {failedOrRejected.map((task) => (
              <li key={task.id}>
                <Link href={`/tasks/${task.id}`} className="hover:underline">
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatWidget({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded border border-neutral-800 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
