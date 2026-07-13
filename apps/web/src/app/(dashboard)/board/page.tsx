import { repositories } from "@/lib/repositories";
import { env } from "@/lib/env";
import { createManualTask } from "./actions";
import { AgentFilter } from "./agent-filter";
import { DescriptionWithImage } from "./description-with-image";
import { DraggableBoard, type BoardColumnData } from "./draggable-board";
import type { Task, TaskStatus } from "@ai-workforce/core";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "assigned", label: "Assigned" },
  { status: "in_progress", label: "In Progress" },
  { status: "ready_for_review", label: "Ready for Review" },
  { status: "approved", label: "Approved" },
  { status: "done", label: "Done" },
];

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

  const boardColumns: BoardColumnData[] = [
    ...COLUMNS.map((col) => ({
      dropStatus: col.status,
      label: col.label,
      tasks: byStatus.get(col.status) ?? [],
    })),
    { dropStatus: "rejected" as TaskStatus, label: "Rejected/Failed", tasks: failedOrRejected, accent: "text-red-400" },
  ];

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

      <DraggableBoard columns={boardColumns} />
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
