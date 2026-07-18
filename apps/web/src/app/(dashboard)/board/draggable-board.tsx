"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { Task, TaskStatus } from "@ai-workforce/core";
import { getTaskForBoard, moveTaskStatus } from "./actions";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

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
export function DraggableBoard({
  columns: initialColumns,
  agentFilter,
}: {
  columns: BoardColumnData[];
  /** Mirrors the board page's `?agent=` searchParam — used to skip Realtime
   * updates for tasks outside the currently filtered view. */
  agentFilter?: string;
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setColumns(initialColumns), [initialColumns]);

  // Live updates: apps/runner writes task changes directly to Supabase from a
  // separate process, so the server-rendered `initialColumns` prop above goes
  // stale the moment an agent (or another tab) moves a card. This subscribes
  // to Postgres changes on `workforce.tasks` and reconciles them into local
  // state, so the board never needs a manual refresh to reflect real state.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function upsertTask(taskId: string) {
      const task = await getTaskForBoard(taskId);
      applyTask(taskId, task, agentFilter);
    }

    const channel = supabase
      .channel("board-tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "workforce", table: "tasks" },
        (payload) => {
          const changed = (payload.new ?? payload.old) as { id?: string } | null;
          const taskId = changed?.id;
          if (!taskId) return;

          if (payload.eventType === "DELETE") {
            applyTask(taskId, null, agentFilter);
            return;
          }
          void upsertTask(taskId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [agentFilter]);

  function applyTask(taskId: string, task: Task | null, filter?: string) {
    setColumns((prev) => {
      const withoutTask = prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }));
      if (!task) return withoutTask;
      if (filter && task.assigneeAgent !== filter) return withoutTask;

      const dropStatus: TaskStatus = task.status === "failed" ? ("rejected" as TaskStatus) : task.status;
      return withoutTask.map((col) =>
        col.dropStatus === dropStatus ? { ...col, tasks: [...col.tasks, task] } : col,
      );
    });
  }

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
