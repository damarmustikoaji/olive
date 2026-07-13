"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { Task, TaskStatus } from "@ai-workforce/core";
import { moveTaskStatus } from "./actions";

export interface BoardColumnData {
  /** The status a card dropped into this column gets moved to. */
  dropStatus: TaskStatus;
  label: string;
  tasks: Task[];
  accent?: string;
}

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

/**
 * Native HTML5 drag-and-drop — no extra dependency for something this
 * simple. Moves are optimistic (local state updates immediately) and
 * reconciled once the server action's revalidatePath brings fresh props
 * back down; a failed move just gets corrected on that next server render.
 */
export function DraggableBoard({ columns: initialColumns }: { columns: BoardColumnData[] }) {
  const [columns, setColumns] = useState(initialColumns);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setColumns(initialColumns), [initialColumns]);

  function handleDrop(dropStatus: TaskStatus) {
    setDragOverStatus(null);
    const taskId = draggingId;
    setDraggingId(null);
    if (!taskId) return;

    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!task || task.status === dropStatus) return;

    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks:
          col.dropStatus === dropStatus
            ? [...col.tasks, { ...task, status: dropStatus }]
            : col.tasks.filter((t) => t.id !== taskId),
      })),
    );

    startTransition(() => {
      moveTaskStatus(taskId, dropStatus);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
      {columns.map((col) => (
        <div
          key={col.dropStatus}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverStatus(col.dropStatus);
          }}
          onDragLeave={() => setDragOverStatus((s) => (s === col.dropStatus ? null : s))}
          onDrop={() => handleDrop(col.dropStatus)}
          className={`space-y-2 rounded ${dragOverStatus === col.dropStatus ? "bg-neutral-900/60 ring-1 ring-neutral-700" : ""}`}
        >
          <h2
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${col.accent ?? "text-neutral-500"}`}
          >
            {col.label}
            <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
              {col.tasks.length}
            </span>
          </h2>
          <div className="space-y-2">
            {col.tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingId(task.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                className={`block rounded border border-neutral-800 border-l-2 bg-neutral-900/40 p-3 text-sm shadow-sm transition hover:border-neutral-600 hover:bg-neutral-900 ${SEVERITY_BORDER[task.severity]} ${draggingId === task.id ? "opacity-40" : ""}`}
              >
                <p className="font-medium leading-snug">{task.title}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className={`rounded px-1.5 py-0.5 ${SEVERITY_BADGE[task.severity]}`}>
                    {task.severity}
                  </span>
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
            {col.tasks.length === 0 && (
              <p className="rounded border border-dashed border-neutral-800 px-3 py-4 text-center text-xs text-neutral-600">
                Kosong
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
