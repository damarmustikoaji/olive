import Link from "next/link";
import { repositories } from "@/lib/repositories";
import { env } from "@/lib/env";
import { createManualTask } from "./actions";
import { AgentFilter } from "./agent-filter";
import { DescriptionWithImage } from "./description-with-image";
import type { Task, TaskStatus } from "@ai-workforce/core";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "assigned", label: "Assigned" },
  { status: "in_progress", label: "In Progress" },
  { status: "ready_for_review", label: "Ready for Review" },
  { status: "approved", label: "Approved" },
  { status: "done", label: "Done" },
];

const SEVERITY_BORDER: Record<string, string> = {
  minor: "border-l-neutral-600",
  medium: "border-l-yellow-600",
  critical: "border-l-red-600",
};

const SEVERITY_BADGE: Record<string, string> = {
  minor: "bg-neutral-800 text-neutral-300",
  medium: "bg-yellow-900/60 text-yellow-300",
  critical: "bg-red-900/60 text-red-300",
};

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const { agent: agentFilter } = await searchParams;

  const [allTasks, agentProfiles] = await Promise.all([
    repositories.tasks.listAll(200),
    repositories.agentProfiles.listAll(),
  ]);

  const tasks = agentFilter ? allTasks.filter((t) => t.assigneeAgent === agentFilter) : allTasks;

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
    done: byStatus.get("done")?.length ?? 0,
  };

  const agentNames = agentProfiles
    .filter((p) => p.status === "active")
    .map((p) => p.agentName)
    .sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Board</h1>
        <AgentFilter agents={agentNames} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatWidget label="Working" value={workforceCounts.working} color="text-blue-400" />
        <StatWidget label="Waiting Approval" value={workforceCounts.waiting} color="text-yellow-400" />
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
          {env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_UPLOAD_PRESET ? (
            <DescriptionWithImage
              cloudName={env.CLOUDINARY_CLOUD_NAME}
              uploadPreset={env.CLOUDINARY_UPLOAD_PRESET}
            />
          ) : (
            <textarea
              name="description"
              placeholder="Deskripsi (opsional)"
              rows={3}
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            />
          )}
          <div className="flex gap-4">
            <label className="space-y-1 text-xs text-neutral-400">
              Severity
              <select
                name="severity"
                defaultValue="medium"
                className="block rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
              >
                <option value="minor">Minor</option>
                <option value="medium">Medium</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-neutral-400">
              Priority
              <select
                name="priority"
                defaultValue="medium"
                className="block rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Buat Task
          </button>
        </form>
      </details>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
        {COLUMNS.map((col) => (
          <BoardColumn key={col.status} label={col.label} tasks={byStatus.get(col.status) ?? []} />
        ))}
        <BoardColumn label="Rejected/Failed" tasks={failedOrRejected} accent="text-red-400" />
      </div>
    </div>
  );
}

function BoardColumn({ label, tasks, accent }: { label: string; tasks: Task[]; accent?: string }) {
  return (
    <div className="space-y-2">
      <h2 className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${accent ?? "text-neutral-500"}`}>
        {label}
        <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
          {tasks.length}
        </span>
      </h2>
      <div className="space-y-2">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/tasks/${task.id}`}
            className={`block rounded border border-neutral-800 border-l-2 bg-neutral-900/40 p-3 text-sm shadow-sm transition hover:border-neutral-600 hover:bg-neutral-900 ${SEVERITY_BORDER[task.severity]}`}
          >
            <p className="font-medium leading-snug">{task.title}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className={`rounded px-1.5 py-0.5 ${SEVERITY_BADGE[task.severity]}`}>{task.severity}</span>
              {task.assigneeAgent ? (
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-neutral-300">
                  {task.assigneeAgent}
                </span>
              ) : (
                <span className="text-neutral-600">unassigned</span>
              )}
            </div>
          </Link>
        ))}
        {tasks.length === 0 && (
          <p className="rounded border border-dashed border-neutral-800 px-3 py-4 text-center text-xs text-neutral-600">
            Kosong
          </p>
        )}
      </div>
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
