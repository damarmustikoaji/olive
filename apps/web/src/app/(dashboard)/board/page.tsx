import { repositories } from "@/lib/repositories";
import { env } from "@/lib/env";
import { AgentFilter } from "./agent-filter";
import { NewTaskForm } from "./new-task-form";
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
        <NewTaskForm cloudName={env.CLOUDINARY_CLOUD_NAME} uploadPreset={env.CLOUDINARY_UPLOAD_PRESET} />
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
